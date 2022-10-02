#!/bin/bash
set -e

NETWORK=host
image_id_file=$(mktemp)

export DOCKER_BUILDKIT=1
docker build \
	--file Dockerfile \
	--iidfile $image_id_file \
	.

docker run \
	--network $NETWORK \
	-v "$PWD":/app \
	-it \
	$(cat $image_id_file)
