CHROMIUM_BUILD_DIR = $(shell pwd)/dist/chromium
FIREFOX_BUILD_DIR = $(shell pwd)/dist/firefox

ifeq (${CHROMIUM_PATH},)
	CHROMIUM_PATH = /usr/bin/chromium-browser
endif

chromium:
	pnpm build:chromium
	${CHROMIUM_PATH} --pack-extension=$(CHROMIUM_BUILD_DIR) --pack-extension-key=${HOME}/.ssh/crx.pem

firefox:
	pnpm build:firefox
	cd $(FIREFOX_BUILD_DIR) && (find . -type f -not -name '*.xpi' -not -name '*.zip' | zip -@ ../$(shell basename $(FIREFOX_BUILD_DIR))-firerss.xpi)

clean:
	rm -rf build dist

all: chromium firefox

.PHONY: all clean chromium firefox