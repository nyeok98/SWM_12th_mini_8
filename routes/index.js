const firebase = require('firebase');
const firebase_config = require('../secret/firebase_config').config;
firebase.initializeApp(firebase_config);

const database = firebase.database();

const express = require('express');
const router = express.Router();
const libKakaoWork = require('../libs/kakaoWork');


router.get('/', async (req, res, next) => {
  // 유저 목록 검색 (1)
  const users = await libKakaoWork.getUserList();

  // 검색된 모든 유저에게 각각 채팅방 생성 (2)
  const conversations = await Promise.all(
    users.map((user) => libKakaoWork.openConversations({ userId: user.id }))
  );

  // 생성된 채팅방에 메세지 전송 (3)
  const messages = await Promise.all([
    conversations.map((conversation) =>
      libKakaoWork.sendMessage({
        conversationId: conversation.id,
        text: '테스트 입력이에요',
        blocks: [
          {
            type: 'header',
            text: 'ㅇㅇ',
            style: 'blue',
          },
          {
            type: 'text',
            text:
              'ㅇㅇ',
            markdown: true,
          },
          {
            type: 'button',
            action_type: 'call_modal',
            value: 'check',
            text: 'ㄱㄱㄱ',
            style: 'default',
          },
        ],
      })
    ),
  ]);

  // 응답값은 자유롭게 작성하셔도 됩니다.
  res.json({
    result: true,
  });
});


router.post('/request', async (req, res, next) => {
  console.log(req.body);
  const { message, value } = req.body;

  switch (value) {
    case 'check':
      // 설문조사용 모달 전송 (3)
      return res.json({
        view: {
          title: '물어볼 거',
          accept: '제출',
          decline: '취소',
          value: 'ask_result',
          blocks: [
            {
              type: 'label',
              text: '오늘 하루 어땠나요?',
              markdown: false,
            },
            {
              type: 'input',
              name: 'wanted',
			  required: true,
              placeholder: 'ex) 오늘 너무 힘들었어요..ㅠ',
            },
          ],
        },
      });
      break;
    default:
  }

  res.json({});
});

const saveMessage = async (convId, text) =>{
	var ref_val = database.ref('conversations/'+convId+'/messages');
	var new_ref = ref_val.push();
	new_ref.set({
		date: new Date().getTime(),
		text: text
	});
};

const loadMessage = async (convId) => {
	var ref_val = database.ref('conversations/'+convId+'/messages').orderByChild('date');
	var data = await ref_val.once('value');	
	data = data.val();
	console.log(data);
	return data;
};

router.post('/callback', async (req, res, next) => {
  console.log(req.body);
  const { message, actions, action_time, value } = req.body;

  switch (value) {
    case 'ask_result':
      // 설문조사 응답 결과 메세지 전송 (3)
		  //todo -> let emotion = await request_emotion()
		//positive라 가정
		a = 2*Math.random()-1;
		if(a>0.01){
			await saveMessage(message.conversation_id, actions.wanted);
			await libKakaoWork.sendMessage({
				conversationId: message.conversation_id,
				text: '오늘 기분이 좋았나봐요',
				blocks: [
				  {
					type: 'text',
					text: '잘 저장했어요!',
					markdown: true,
				  },
				  {
					type: 'description',
					term: '저장된 내용',
					content: {
					  type: 'text',
					  text: actions.wanted,
					  markdown: false,
					},
					accent: true,
				  }
				],
			  });
			}
		  else {
			  var loaded = await loadMessage(message.conversation_id);
			  await libKakaoWork.sendMessage({
				conversationId: message.conversation_id,
				text: '오늘 기분이 그닥인가요',
				blocks: [
				  {
					type: 'text',
					text: '머선129',
					markdown: true,
				  }
				],
			  });
		  }
		  break;
    default:
  }

  res.json({ result: true });
});

module.exports = router;