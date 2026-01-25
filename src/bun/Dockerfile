FROM public.ecr.aws/awsguru/aws-lambda-adapter:0.9.1 AS adapter
FROM oven/bun:debian AS bun

COPY --from=adapter /lambda-adapter /opt/extensions/lambda-adapter

ENV PORT=8080

WORKDIR "/var/task"

COPY package.json bun.lock ./

RUN bun install --production --frozen-lockfile

COPY . /var/task

CMD ["bun", "hw/index.ts"]
