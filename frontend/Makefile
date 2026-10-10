SHELL := $(shell which bash)
ENV = /usr/bin/env

.SHELLFLAGS = -c # Run commands in a -c flag
.SILENT: ; # no need for @
.ONESHELL: ; # recipes execute in same shell
.NOTPARALLEL: ; # wait for this target to finish
.EXPORT_ALL_VARIABLES: ; # send all vars to shell

.PHONY: all # All targets are accessible for user
.DEFAULT: help # Running Make will run the help target

ifneq (,$(wildcard ./.env))
    include .env
    export
endif

help: ## Show Help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(firstword $(MAKEFILE_LIST)) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

#
# GENERAL
#
dependencies: ## Get dependencies
	npm i


build: ## Build the app locally with prod environment
	make dependencies
	ionic build --prod

lint: ## Lint code
	npm run lint

format: ## Format code
	npm run format

serve: ## Serve
	ionic serve

deploy-pwa: ## deploy PWA to preview env
	ionic build --prod
	rsync -a www/ be-pragmatic-dmi@dmi.be-pragmatic.com:htdocs/dmi.be-pragmatic.com
