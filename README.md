# PGMobile

## Docker 로컬 빌드

### 기본 빌드 (기본값 사용)
```bash
docker build -t pgmobile:latest .
```

### 빌드 인자 포함 빌드
```bash
docker build \
  --build-arg PG_PORT=3000 \
  --build-arg P_MID=INIpayTest \
  --build-arg HashKey=3CB8183A4BE283555ACC8363C0360223 \
  -t pgmobile:latest \
  .
```

### 빌드 후 실행
```bash
# 기본 포트(3000)로 실행
docker run -p 3000:3000 pgmobile:latest

# 다른 포트로 실행
docker run -p 8080:3000 pgmobile:latest
```

### 환경 변수 오버라이드 실행
```bash
docker run -p 3000:3000 \
  -e PG_PORT=3000 \
  -e P_MID=INIpayTest \
  -e HashKey=3CB8183A4BE283555ACC8363C0360223 \
  pgmobile:latest
```
