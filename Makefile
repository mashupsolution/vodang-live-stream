.DEFAULT_GOAL := run

.PHONY: run install setup tts build start test help

run: tts
	npm run dev

# Idempotent: installs the ZeroTTS Python package and model once, then skips.
# Failure (offline, no uv/python3) is not fatal; narration falls back to Linh/Edge.
tts:
	@if [ "$$ZEROTTS" = "0" ]; then echo 'ZeroTTS disabled (ZEROTTS=0).'; exit 0; fi; \
	if [ ! -x .venv/bin/python ] || ! .venv/bin/python -c 'import zerotts' >/dev/null 2>&1; then \
		echo 'Installing ZeroTTS into .venv ...'; \
		( if command -v uv >/dev/null 2>&1; then uv venv .venv && uv pip install --python .venv/bin/python zerotts huggingface_hub; \
		  else python3 -m venv .venv && .venv/bin/python -m pip install zerotts huggingface_hub; fi ) \
		|| { echo 'ZeroTTS install failed; falling back to Linh/Edge.'; exit 0; }; \
	fi; \
	if [ ! -f data/zerotts-model/config.json ]; then \
		echo 'Downloading ZeroTTS model (~1 GB) to data/zerotts-model ...'; \
		mkdir -p data; \
		.venv/bin/python -c "from huggingface_hub import snapshot_download as d; d('zeroweight-ai/ZeroTTS', local_dir='data/zerotts-model')" \
		|| { echo 'ZeroTTS model download failed; falling back to Linh/Edge.'; rm -rf data/zerotts-model; exit 0; }; \
	fi

install:
	npm ci

setup: install tts
	@if [ -e .env ]; then \
		printf '%s\n' '.env already exists; keeping it unchanged.'; \
	else \
		cp -n .env.example .env; \
		printf '%s\n' 'Created .env from .env.example; edit it to configure TikTok.'; \
	fi

build:
	npm run build

start:
	npm start

test:
	npm test

help:
	@printf '%s\n' \
		'make / make run  Install ZeroTTS if missing, then start the dev server' \
		'make setup       Install dependencies and create .env if absent' \
		'make tts         Install ZeroTTS (.venv + model) if missing' \
		'make install     Install dependencies with npm ci' \
		'make build       Build the production application' \
		'make start       Start the built production application' \
		'make test        Run unit and integration tests' \
		'make help        Show this help'
