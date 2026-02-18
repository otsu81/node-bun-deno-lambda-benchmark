FROM public.ecr.aws/awsguru/aws-lambda-adapter:0.9.1 AS aws-lambda-adapter
FROM denoland/deno:bin-2.2.1 AS deno_bin
FROM debian:bookworm-slim AS deno_runtime

COPY --from=aws-lambda-adapter /lambda-adapter /opt/extensions/lambda-adapter
COPY --from=deno_bin /deno /usr/local/bin/deno

ENV PORT=8080

RUN mkdir /var/deno_dir
ENV DENO_DIR=/var/deno_dir

WORKDIR "/var/task"
COPY . /var/task

# Download and cache all npm deps into the image (fails build if unreachable)
RUN deno cache jwtSign/index.ts jwtValidate/index.ts jsonProcess/index.ts compression/index.ts arrayOps/index.ts

# Warm up each handler — starts the server, lets Deno fully compile + cache
# all code, then kills it after 10s (exit 124 = timeout = success)
RUN timeout 10s deno run -A jwtSign/index.ts      || [ $? -eq 124 ] || exit 1
RUN timeout 10s deno run -A jwtValidate/index.ts  || [ $? -eq 124 ] || exit 1
RUN timeout 10s deno run -A jsonProcess/index.ts  || [ $? -eq 124 ] || exit 1
RUN timeout 10s deno run -A compression/index.ts  || [ $? -eq 124 ] || exit 1
RUN timeout 10s deno run -A arrayOps/index.ts     || [ $? -eq 124 ] || exit 1

CMD ["deno", "run", "-A", "jwtSign/index.ts"]
