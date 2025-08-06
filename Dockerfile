FROM denoland/deno

WORKDIR /app

# Copy configuration and source
COPY deno.jsonc deno.lock ./
COPY src/ ./src/

# Cache dependencies
RUN deno cache src/main.ts

RUN chown -R deno:deno /app
USER deno

EXPOSE 9090

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD deno eval "const res = await fetch('http://localhost:9090/health'); Deno.exit(res.ok ? 0 : 1)"

CMD ["deno", "run", "--allow-net", "--allow-env", "--allow-read", "src/main.ts"]
