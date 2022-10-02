#!/bin/sh
chown -R dev:dev /app
exec runuser -u dev bash
