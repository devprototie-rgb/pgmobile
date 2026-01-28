# 멀티 스테이지 빌드를 사용하여 최적화된 이미지 생성
FROM node:18-alpine AS builder

# ---- Proxy (빌드 시에만 사용 가능하도록 분리) ----
ENV http_proxy=http://squid.natecorp.net:80 
ENV https_proxy=http://squid.natecorp.net:80 

# 작업 디렉토리 설정
WORKDIR /app

# package.json과 package-lock.json 복사
COPY package*.json ./

# 의존성 설치
RUN npm ci --only=production

# 프로덕션 이미지
FROM node:18-alpine

# 작업 디렉토리 설정
WORKDIR /app

# 프로덕션 의존성만 복사
COPY --from=builder /app/node_modules ./node_modules

# 애플리케이션 소스 코드 복사
COPY app.js .
COPY properties.js .
COPY views ./views

# 빌드 인자로 포트 주입받기
ARG PG_PORT=3000
ARG P_MID=INIpayTest
ARG HashKey=3CB8183A4BE283555ACC8363C0360223

# 환경 변수 설정
ENV PG_PORT=${PG_PORT}
ENV NODE_ENV=production
ENV P_MID=${P_MID}
ENV HashKey=${HashKey}

# 포트 노출 (ARG로 받은 값 사용)
EXPOSE ${PG_PORT}

# 비root 사용자로 실행 (보안 강화)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# 애플리케이션 실행
CMD ["node", "app.js"]
