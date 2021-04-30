const firebase = require('firebase');
const firebase_config = require('../configs/app/firebase_config').config;
firebase.initializeApp(firebase_config);

const moment = require('moment-timezone');
const database = firebase.database();
// routes/index.js
const express = require('express');
const router = express.Router();

const libKakaoWork = require('../libs/kakaoWork');

const nlp = require('../google-nlp-api/sentiment'); // google natural language 분석 api 관련 함수

async function sendMainMessage(conversation_id){
    return await libKakaoWork.sendMessage({
        conversationId: conversation_id,
        text: '팔만대장경팀 - To.Tomorrow ✍️',
        blocks: [
            {
                type: 'header',
                text: 'To.Tomorrow ✍️',
                style: 'blue',
            },
            {
                type: 'text',
                text: '당신의 내일에게.\n*To. Tomorrow 입니다.*\n단지 기록을 넘어, 당신의 감정을 느끼고 위로합니다.',
                markdown: true,
            },
            {
                type: 'divider',
            },
            {
                type: 'text',
                text:
                    '오늘을 담는 건,\n내일의 나를 위한 것이에요.\n\n밝았던 날, 울적했던 날,\n그 모든 어제가 모여 지금의 내가 되었듯,\n오늘도 기록을 남겨봅시다. ✍️',
                markdown: true,
            },
            {
                type: 'button',
                action_type: 'call_modal',
                value: 'daily_record',
                text: '기록하러 가기',
                style: 'default',
            },
            {
                type: 'context',
                content: {
                    type: 'text',
                    text:
                        '[To. Tomorrow 톺아보기](https://github.com/nyeok98/SWM_12th_mini_8)',
                    markdown: true,
                },
                image: {
                    type: 'image_link',
                    url: 'https://i.stack.imgur.com/41B3U.png',
                },
            },
        ],
    }
)}

//const sendMainMessage = async (conversation) => )

router.get('/', async (req, res, next) => {
    // 유저 목록 검색 (1)
    const users = await libKakaoWork.getUserList();

    // 검색된 모든 유저에게 각각 채팅방 생성 (2)
    const conversations = await Promise.all(
        users.map((user) => libKakaoWork.openConversations({ userId: user.id }))
    );

    // 생성된 채팅방에 메세지 전송 (3)
    const messages = await Promise.all([
        conversations.map((conversation)=>sendMainMessage(conversation.id)),
    ]);

    // 응답값은 자유롭게 작성하셔도 됩니다.
    res.json({
        users,
        conversations,
        messages,
    });
});

router.post('/chatbot', async (req, res, next) => {
    // 유저 목록 검색 (1)
    const users = await libKakaoWork.getUserList();

    // 검색된 모든 유저에게 각각 채팅방 생성 (2)
    const conversations = await Promise.all(
        users.map((user) => libKakaoWork.openConversations({ userId: user.id }))
    );

    // 생성된 채팅방에 메세지 전송 (3)
    const messages = await Promise.all([
        conversations.map((conversation)=>sendMainMessage(conversation.id)),
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
                    title: '오늘의 기록',
                    accept: '확인',
                    decline: '취소',
                    value: `{"action":"daily_record_string"}`,
                    blocks: [
                        {
                            type: 'label',
                            text: '오늘은 어떤 일이 있었나요?',
                            markdown: true,
                        },
                        {
                            type: 'input',
                            name: 'record',
                            required: true,
                            placeholder: '하루를 전해주세요.',
                        },
                    ],
                },
            });
            break;
        default:
    }

    res.json({});
});

const saveMessage = async (convId, text, time) => {
    var ref_val = database.ref('conversations/' + convId + '/messages');
    var new_ref = ref_val.push();
    new_ref.set({
        date: new Date(time), // 메시지를 작성했던 시간을 가져올 수 있게 수정했습니다
        text: text,
    });
};

const getRandomSentence = (sentences) => {
    //가장 예전에 작성한거의 probability distribution function값이 가장 최근보다 linear하게 3배 높을 때 idx를 구하고 해당 element를 return하는 함수입니다.
    var r = Math.random();
    var converted = -Math.sqrt(-2 * r + 9 / 4) + 3 / 2;
    var to_pick = parseInt(converted * sentences.length);

    to_pick = Math.min(sentences.length - 1, to_pick);
    to_pick = Math.max(0, to_pick);
    return sentences[to_pick];
};

const loadMessage = async (convId) => {
    //날짜는 못 가져오나..??
    var ref_val = database.ref('conversations/' + convId + '/messages').orderByChild('date');
    var data = await ref_val.once('value');
    data = data.val();
    console.log(data);
    var list_data = [];
    for (let v in data) {
        s = data[v];
        var seoul = moment(s.date).tz('Asia/Seoul');

        s.date = seoul.toDate();
        list_data.push([s.text, s.date]);
    }
    sentence = getRandomSentence(list_data);
    return sentence;
};

router.post('/callback', async (req, res, next) => {
    const { message, actions, action_time, value } = req.body;
    const callBackData = JSON.parse(value);
    console.log(callBackData);
    switch (callBackData.action) {
        case 'daily_record_string':
            // 기록 응답 결과 송출 및 긍/부정에 따른 액션
            const sentimental = await nlp.getSentiment(actions.record);
            if (sentimental < 0) {
                var loaded = await loadMessage(message.conversation_id);
				loaded[1] = loaded[1] ? new Date(loaded[1]) : 0
                await libKakaoWork.sendMessage({
                    conversationId: message.conversation_id,
                    text: 'To.Tomorrow ✍️',
                    blocks: [
                        {
                            type: 'text',
                            text: `*오늘도 하루를 오롯이 기록해보았습니다.*`,
                            markdown: true,
                        },
                        {
                            type: 'text',
                            text: loaded[1]
                                ? `그리 좋진 않은 하루였나봐요.\n오늘의 기억은 그저 묻어두고\n그럼에도 좋았던 날들을 떠올려봅니다😊\n`
                                : '아직 저장된 기록이 없습니다. ',
                            markdown: true,
                        },
                        {
                            type: 'divider',
                        },
                        {
                            type: 'text',
                            text: loaded[1]
                                ? `*${loaded[1].getFullYear()}년 ${
                                      loaded[1].getMonth() + 1
                                  }월 ${loaded[1].getDate()}일 ${loaded[1].getHours()}시 ${loaded[1].getMinutes()}분*의 기억입니다.`
                                : '',
                            markdown: true,
                        },
                        {
                            type: 'text',
                            text: loaded[1] ? `"${loaded[0]}"` : '',
                            markdown: true,
                        },
                    ],
                });
				await sendMainMessage(message.conversation_id)
            } else {
                // 저장할까요 물어보기

                // 저장 시 돌아오는 콜백에는 메시지 정보가 없으므로
                // 이를 미리 담아서 보내야 함
                let dataToSend = {
                    action: 'record_yes',
                    time: Date.now(),
                    text: actions.record,
                };
                await libKakaoWork.sendMessage({
                    conversationId: message.conversation_id,
                    text: 'To.Tomorrow ✍️',
                    blocks: [
                        {
                            type: 'text',
                            text: `*오늘도 하루를 오롯이 기록해보았습니다.*`,
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
                                    type: 'button',
                                    action_type: 'submit_action',
                                    value: JSON.stringify(dataToSend),
                                    action_name: 'record_yes',
                                    text: '예',
                                    style: 'primary',
                                },
                                {
                                    type: 'button',
                                    action_type: 'submit_action',
                                    value: `{"action":"record_no"}`,
                                    action_name: 'record_no',
                                    text: '아니오',
                                    style: 'danger',
                                }
                            ]
                        }
                        
                    ],
                });
            }
            break;
        case 'record_yes': // 저장한다고 선택하면
            // 저장하는 부분
            await saveMessage(message.conversation_id, callBackData.text, callBackData.time);
            // 저장했습니다 메시지 보내기
            let load = moment(callBackData.time).tz('Asia/Seoul');
            console.log(load.toString())
			console.log(load.format())
            await libKakaoWork.sendMessage({
                conversationId: message.conversation_id,
                text: '오늘의 좋은 기억을 온전히 저장했습니다.',
                blocks: [
                    {
                        type: 'text',
                        text: `*오늘의 좋은 기억을 온전히 저장했습니다.*`,
                        markdown: true,
                    },
                    {
                        type: 'text',
                        text: load?`시간: ${load.Years()}년 ${
                            load.getMonth() + 1
                        }월 ${load.getDate()}일 ${load.getHours()}시 ${load.getMinutes()}분 \n\n내용: ${callBackData.text}`:"err",
                        markdown: true,
                    },
                ],
            });
			await sendMainMessage(message.conversation_id)
            break
		case 'record_no':
			await sendMainMessage(message.conversation_id)
            break
		
        default:
    }

    res.json({ result: true });
});

module.exports = router;