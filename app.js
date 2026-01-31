const express = require('express');
const app = express();
const crypto = require('crypto');
const bodyParser = require('body-parser');
const request = require('request');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.set('views', __dirname + '/views');
app.set('views engline', 'ejs');
app.engine('html', require('ejs').renderFile);

app.use(express.static('views'));
const getUrl = require('./properties');

var HashMap = require('hashmap');

const {
  P_MID = 'INIpayTest',
  HashKey = '3CB8183A4BE283555ACC8363C0360223',
  // BASE_URL = 'http://localhost:3000',
  BASE_URL = 'https://imaginative-gerardo-sallowish.ngrok-free.dev',
} = process.env;

const P_NEXT_URL = BASE_URL + '/INImobile_mo_return.ejs';

app.get('/', (req, res) => {
  console.log('==================== 결제 요청 시작 (GET /) ====================');
  console.log('[프론트엔드 수신 데이터]:', req.query);
  // 프론트엔드에서 받은 데이터로 교체 (없을 경우 기본값 사용)
  const P_OID = req.query.P_OID || (P_MID + '_' + Date.now());
  const P_AMT = req.query.P_AMT || '10';
  const P_GOODS = req.query.P_GOODS || '테스트상품';
  const P_UNAME = req.query.P_UNAME || '';
  const P_MOBILE = req.query.P_MOBILE || '';
  const P_EMAIL = req.query.P_EMAIL || '';
  const P_NOTI = req.query.P_NOTI || '';
  const P_INI_PAYMENT = req.query.P_INI_PAYMENT || 'CARD';

  const P_TIMESTAMP = Date.now();

  // BASE64_ENCODE(SHA512(P_AMT+P_OID+P_TIMESTAMP+HashKey))
  const data = P_AMT + P_OID + P_TIMESTAMP + HashKey;
  const hash = crypto
    .createHash('sha512')
    .update(data, 'utf8')
    .digest('base64');

  console.log('[결제 요청 파라미터 구성 완료]');
  const renderParams = {
    P_MID: P_MID,
    P_OID: P_OID,
    P_AMT: P_AMT,
    P_GOODS: P_GOODS,
    P_UNAME: P_UNAME,
    P_MOBILE: P_MOBILE,
    P_EMAIL: P_EMAIL,
    P_TIMESTAMP: P_TIMESTAMP,
    P_CHKFAKE: hash,
    P_NEXT_URL: P_NEXT_URL,
    P_NOTI: P_NOTI,
    P_INI_PAYMENT: P_INI_PAYMENT
  };
  console.log(JSON.stringify(renderParams, null, 2));
  console.log('==============================================================');

  res.render('INImobile_mo_req.html', renderParams);
});

app.post('/INImobile_mo_return.ejs', (req, res) => {
  console.log('==================== 결제 인증 결과 수신 (POST /INImobile_mo_return.ejs) ====================');
  console.log('[인증 결과 데이터]');
  console.log(req.body);

  //인증 결과 성공 시
  if (req.body.P_STATUS === '00') {
    console.log('>>> 인증 성공 (P_STATUS: 00)');
    const P_STATUS = req.body.P_STATUS; // 결과코드
    const P_RMESG1 = req.body.P_RMESG1; // 결과메시지
    const P_TID = req.body.P_TID; // 인증거래번호(성공시에만 전달)
    const P_AMT = req.body.P_AMT; // 거래금액
    const P_NOTI = req.body.P_NOTI; // 가맹점 임의 데이터

    //결제 승인 요청
    let options = {
      P_MID: P_TID.substring(10, 20), //상점 아이디 설정 : 결제요청 페이지에서 사용한 MID값과 동일하게 세팅
      P_TID: P_TID,
    };

    console.log('[승인 요청 준비]');
    console.log('- P_MID (extracted):', options.P_MID);
    console.log('- P_TID:', options.P_TID);

    //##########################################################################
    // 승인요청 API url (P_REQ_URL) 리스트 는 properties 에 세팅하여 사용합니다.
    // idc_name 으로 수신 받은 센터 네임을 properties 에서 include 하여 승인요청하시면 됩니다.
    //##########################################################################

    const idc_name = req.body.idc_name;
    const P_REQ_URL = req.body.P_REQ_URL; // 승인요청 URL
    const P_REQ_URL2 = getUrl.getAuthUrl(idc_name);

    console.log('- idc_name:', idc_name);
    console.log('- P_REQ_URL (from body):', P_REQ_URL);
    console.log('- P_REQ_URL2 (from properties):', P_REQ_URL2);

    if (P_REQ_URL == P_REQ_URL2) {
      console.log('>>> 승인 요청 URL 검증 성공. 승인 API 호출 시작...');
      // to.가람
      // /api/v1/payment/log type:prepare 호출 후 결제 처리
      request.post(
        { method: 'POST', uri: P_REQ_URL2, form: options },
        (err, httpResponse, body) => {
          console.log('==================== 결제 승인 응답 수신 ====================');
          if (err) {
            console.error('!!! 승인 요청 API 호출 에러:', err);
          }
          try {
            let values = [];
            values = new String(body).split('&');
            console.log('[승인 결과 원본 데이터]');
            console.log(values);

            var map = new HashMap();
            const mapJson = {};
            for (let x = 0; x < values.length; x++) {
              // 승인결과를 파싱값 잘라 hashmap에 저장
              let i = values[x].indexOf('=');
              let key1 = values[x].substring(0, i);
              let value1 = values[x].substring(i + 1);
              map.set(key1, value1);
              mapJson[key1] = value1;
            }
            console.log('[승인 결과 파싱 데이터]');
            console.log(JSON.stringify(mapJson, null, 2));

            console.log('>>> 최종 결제처리 완료 후 프론트엔드로 리다이렉트');

            // 모든 결과 데이터를 쿼리 스트링으로 변환
            const queryString = Object.keys(mapJson)
              .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(mapJson[key])}`)
              .join('&');

            const redirectUrl = `http://192.168.45.244:8080/payment/gift-completed?${queryString}`;
            console.log('- Redirect URL:', redirectUrl);
            res.redirect(redirectUrl);

            // to.가람
            // 결제처리 완료후 /api/v1/payment/provide api 호출하여 결제처리 완료 처리
            // 에러 발생시 망취소 처리(아래 참고)
          } catch (e) {
            console.error('!!! 승인 결과 처리 중 예외 발생:', e);

            // 예외 발생 시에도 프론트엔드로 에러 정보와 함께 리다이렉트
            const errorRedirectUrl = `http://192.168.45.244:8080/payment/gift-completed?order_id=${req.body.P_NOTI || ''}&p_status=FAIL&error_msg=${encodeURIComponent(e.message)}`;
            console.log('- Error Redirect URL:', errorRedirectUrl);
            res.redirect(errorRedirectUrl);

            // to.가람
            /*
              가맹점에서 승인결과 전문 처리 중 예외발생 시 망취소 요청할 수 있습니다.
              승인요청 전문과 동일한 스펙으로 진행되며, 인증결과 수신 시 전달받은 "{인증결과 전달된 P_REQ_URL의 HOST}/smart/payNetCancel.ini" 로 망취소요청합니다.
        
              ** 망취소를 일반 결제취소 용도로 사용하지 마십시오.
              일반 결제취소는 INIAPI 취소/환불 서비스를 통해 진행해주시기 바랍니다.
            */

            let options2 = {
              P_TID: req.body.P_TID,
              P_MID: req.body.P_TID.substring(10, 20),
              P_AMT: req.body.P_AMT,
              P_OID: req.body.P_NOTI,
            };

            const cancelUri = P_REQ_URL2.substring(0, 27) + '/smart/payNetCancel.ini';
            console.log('>>> 망취소 요청 시작 (URI:', cancelUri, ')');
            console.log('[망취소 요청 데이터]', options2);

            request.post(
              {
                method: 'POST',
                uri: cancelUri,
                form: options2,
                json: true,
              },
              (err, httpResponse, body) => {
                let result = err ? err : JSON.stringify(body);
                console.log('==================== 망취소 응답 수신 ====================');
                console.log(result);
              },
            );

            // to.가람
            // 취소처리후 /api/v1/payment/log type:cancel 호출
          }
        },
      );
    } else {
      console.error('!!! 승인 요청 URL 검증 실패 (P_REQ_URL != P_REQ_URL2)');
    }
  } else {
    console.log('>>> 인증 실패 (P_STATUS:', req.body.P_STATUS, ')');
    console.log('[인증 실패 메시지]:', req.body.P_RMESG1);

    const failRedirectUrl = `http://192.168.45.244:8080/payment/gift-completed?order_id=${req.body.P_OID || ''}&p_status=${req.body.P_STATUS}&error_msg=${encodeURIComponent(req.body.P_RMESG1 || '인증 실패')}`;
    console.log('- Fail Redirect URL:', failRedirectUrl);
    res.redirect(failRedirectUrl);
  }
});

const PORT = process.env.PG_PORT || 3000;
app.listen(PORT, (err) => {
  if (err) return console.log(err);
  console.log(`The server is listening on port ${PORT}`);
  console.log(`http://localhost:${PORT}`);
});
