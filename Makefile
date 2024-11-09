CHROMIUM_BUILD_DIR = $(shell pwd)/build/chromium
FIREFOX_BUILD_DIR = $(shell pwd)/build/firefox

ifeq (${CHROMIUM_PATH},)
	CHROMIUM_PATH = /usr/bin/chromium-browser
endif

chromium:
	npx tsc -p tsconfig.json
	mkdir -p $(CHROMIUM_BUILD_DIR)/{html,css,js,img}
	cp -r dist/* $(CHROMIUM_BUILD_DIR)/js
	cp -r assets/* $(CHROMIUM_BUILD_DIR)/img
	cp manifest.chromium.json $(CHROMIUM_BUILD_DIR)/manifest.json
	cp src/html/* $(CHROMIUM_BUILD_DIR)/html
	cp src/css/* $(CHROMIUM_BUILD_DIR)/css
	${CHROMIUM_PATH} --pack-extension=$(CHROMIUM_BUILD_DIR) --pack-extension-key=${HOME}/.ssh/crx.pem

firefox:
	npx tsc -p tsconfig.json
	mkdir -p $(FIREFOX_BUILD_DIR)/{html,css,js,img}
	cp -r dist/* $(FIREFOX_BUILD_DIR)/js
	cp -r assets/* $(FIREFOX_BUILD_DIR)/img
	cp manifest.firefox.json $(FIREFOX_BUILD_DIR)/manifest.json
	cp src/html/* $(FIREFOX_BUILD_DIR)/html
	cp src/css/* $(FIREFOX_BUILD_DIR)/css
	cd $(FIREFOX_BUILD_DIR) && (find . -type f -not -name '*.xpi' -not -name '*.zip' | zip -@ ../$(shell basename $(FIREFOX_BUILD_DIR))-firerss.xpi)

clean:
	rm -rf build dist

all: chromium firefox

.PHONY: all clean chromium firefox