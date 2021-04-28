// routes/index.js
const express = require('express');
const router = express.Router();

const libKakaoWork = require('../libs/kakaoWork');

const nlp=require('../google-nlp-api/sentiment'); // google natural language 분석 api 관련 함수

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
        text: "오늘의 기록 ✍️",
		blocks: [
			{
				type: "header",
				text: "오늘의 기록 ✍️",
				style: "blue"
			},
			{
				type: "text",
				text: "오늘을 담는 건, \n내일의 나를 위한 것이에요.\n밝았던 날, 울적했던 날,\n그 모든 어제가 모여 지금의 내가 되었듯이, \n오늘도 기록을 남겨봅시다. ✍️",
				markdown: true
			},
			{
				type: "button",
				action_type: 'call_modal',
            	value: 'daily_record',
				text: "기록하러 가기",
				style: "default"
			}
		],
      })
    ),
  ]);

  // 응답값은 자유롭게 작성하셔도 됩니다.
  res.json({
    users,
    conversations,
    messages,
  });
});


router.post('/request', async (req, res, next) => {
  const { message, value } = req.body;

  switch (value) {
    case 'daily_record':
      // 기록용 모달 전송
      return res.json({
        view: {
          title: "오늘의 기록",
          accept: "확인",
          decline: "취소",
          value: "daily_record_string",
          blocks: [
            {
				type: "label",
				text: "오늘은 어떤 일이 있었나요?",
				markdown: true
            },
            {
				type: "input",
				name: "record",
				required: true,
				placeholder: "하루를 전해주세요."
           },
          ],
        },
      });
      break;
    default:
  }

  res.json({});
});

const getPastText = (user_id)=>{
	//저장된 파일(또는 db)에서 유저아이디 검색 후, 저장된 일자와 텍스트 불러오기..?
	return {pastDate, pastText};
}
router.post('/callback', async (req, res, next) => {
  const { message, actions, action_time, value } = req.body;

  switch (value) {
    case 'daily_record_string':
      // 기록 응답 결과 송출 및 긍/부정에 따른 액션
	  const sentimental=await nlp.getSentiment(actions.record);
	  if(sentimental<0){
		  // 대충 과거 좋았던 거 보내는 부분
		/*
		let {pastDate,pastText} = getPastText(유저아이디)
		*/
		await libKakaoWork.sendMessage({
			conversationId: message.conversation_id,
			text: '당신의 하루를 온전히 담았습니다.',
			blocks: [
			  {
				type: 'text',
				text: `당신의 하루를 온전히 담았습니다.`,
				markdown: true,
			  },
			  {
				type: 'text',
				text: `그리 좋진 않은 하루였나봐요.\n그럼에도 이런 좋은 날이 있기에 살아갑니다😊`,
				markdown: true,
			  }
			
			],
        });
	  } else{
		  // 저장할까요 물어보기
		await libKakaoWork.sendMessage({
			conversationId: message.conversation_id,
			text: '당신의 하루를 온전히 담았습니다.',
			blocks: [
			  {
				type: 'text',
				text: `당신의 하루를 온전히 담았습니다.`,
				markdown: true,
			  },
			  {
				type: 'text',
				text: '오늘의 좋은 기억을 저장하시겠습니까?',
				markdown: true,
			  },
			  {
				type: "action",
				elements: [
					{
						type: "button",
						action_type: 'submit_action',
						value: 'record_yes',
						text: "네",
						style: "primary"
					},
					{
						type: "button",
						text: "아니오",
						style: "danger"
					}
				]
			  }
			],
        });
	  }
      break;
	case 'record_yes': // 저장한다고 선택하면
	  // 저장하는 부분
    default:
  }

  res.json({ result: true });
});

module.exports = router;