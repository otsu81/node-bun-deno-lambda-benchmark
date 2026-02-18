FROM public.ecr.aws/awsguru/aws-lambda-adapter:0.9.1 AS adapter

FROM oven/bun:debian AS builder

WORKDIR /build

COPY bun/package.json bun/bun.lock ./
RUN bun install --frozen-lockfile

COPY bun/ ./bun/
COPY common/ ./common/

RUN for h in jwtSign jwtValidate jsonProcess compression arrayOps; do \
      bun build --target=bun --outfile=bun/dist/$h.js bun/$h/index.ts; \
    done

FROM oven/bun:debian AS runtime

COPY --from=adapter /lambda-adapter /opt/extensions/lambda-adapter

ENV PORT=8080

WORKDIR /var/task

COPY --from=builder /build/bun/dist ./dist

CMD ["bun", "dist/jwtSign.js"]
