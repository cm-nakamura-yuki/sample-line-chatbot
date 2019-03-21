import * as Line from '@line/bot-sdk';
import * as Aws from 'aws-sdk';
import * as rp from 'request-promise';

let channelAccessToken:string = '';
if (process.env.CHANNEL_ACCESS_TOKEN) {
    channelAccessToken = process.env.CHANNEL_ACCESS_TOKEN;
}

let tableName:string = '';
if (process.env.TABLE_NAME) {
    tableName = process.env.TABLE_NAME;
}

let chanelId:string = '';
if (process.env.CHANNEL_ID) {
    chanelId = process.env.CHANNEL_ID;
}

let channelSecret:string = '';
if (process.env.CHANNEL_SECRET) {
    channelSecret = process.env.CHANNEL_SECRET;
}

const Client = new Line.Client({channelAccessToken: channelAccessToken});
const dynamo = new Aws.DynamoDB.DocumentClient();


exports.handler = async(event:any) => {
    console.log(JSON.stringify(event));
    let orderId = event.queryStringParameters.orderId;
    let transactionId = event.queryStringParameters.transactionId;

    let param:Aws.DynamoDB.DocumentClient.GetItemInput = {
        TableName: tableName,
        Key: {
            transactionId: orderId
        }
    };
    
    let getData:Aws.DynamoDB.DocumentClient.GetItemOutput = await dynamo.get(param).promise();
    let user = JSON.parse(getData.Item.Attributes);

    let paymentUrl = 'https://sandbox-api-pay.line.me/v2/payments/'+ transactionId +'/confirm';
    let options:rp.Options = {
        url: paymentUrl,
        body: JSON.stringify({
            amount: user.amount,
            currency: 'JPY'
        }),
        headers: {
            'Content-Type': 'application/json',
            'X-LINE-ChannelId': chanelId,
            'X-LINE-ChannelSecret': channelSecret
        }
    }
    let data = await rp.post(paymentUrl, options).promise();
    console.log(JSON.stringify(data));

    let userId:string = user.lineUserId;
    let message:Line.TextMessage[] = [{
        type: 'text',
        text: 'ありがとうございます。決済が完了しました。'
    }];

    let result = await Client.pushMessage(userId, message);
    console.log(JSON.stringify(result));

    return { statusCode: 200 };
};