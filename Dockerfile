FROM node:16-bullseye
RUN apt update && apt install vim -y
RUN useradd -ms /bin/bash dev

COPY entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/bin/sh", "entrypoint.sh"]
