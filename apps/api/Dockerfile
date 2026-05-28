FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/agent/package.json apps/agent/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages ./packages

RUN pnpm install --frozen-lockfile --filter @pr_hospitalagent/api...

COPY apps/api apps/api

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["pnpm", "--filter", "@pr_hospitalagent/api", "start"]
