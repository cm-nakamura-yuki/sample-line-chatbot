import * as Line from '@line/bot-sdk';
import * as Aws from 'aws-sdk';
import * as rp from 'request-promise';
const Client = new Line.Client({channelAccessToken: 'xxxxxx'});
const dynamo = new Aws.DynamoDB.DocumentClient();

exports.handler = async(event:any) => {
    console.log(JSON.stringify(event));
    let orderId = event.queryStringParameters.orderId;
    let transactionId = event.queryStringParameters.transactionId;

    let param:Aws.DynamoDB.DocumentClient.GetItemInput = {
        TableName: 'payments',
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
            'X-LINE-ChannelId': 'xxxxxx',
            'X-LINE-ChannelSecret': 'xxxxxx'
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