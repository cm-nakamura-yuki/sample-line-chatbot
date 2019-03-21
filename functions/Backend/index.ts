import * as Aws from 'aws-sdk';
import * as rp from 'request-promise';
import * as Line from '@line/bot-sdk';

let channelAccessToken:string = '';
if (process.env.CHANNEL_ACCESS_TOKEN) {
    channelAccessToken = process.env.CHANNEL_ACCESS_TOKEN;
}

let channelId:string = '';
if (process.env.CHANNEL_ID) {
    channelId = process.env.CHANNEL_ID;
}

let channelSecret:string = '' 
if (process.env.CHANNEL_SECRET) {
    channelSecret = process.env.CHANNEL_SECRET;
}

let imgDomain:string = '';
if (process.env.IMG_DOMAIN_NAME) {
    imgDomain = process.env.IMG_DOMAIN_NAME;
}

let apiDomain:string = '';
if (process.env.API_DOMAIN_NAME) {
    apiDomain = process.env.API_DOMAIN_NAME;
}

let tableName:string = '';
if (process.env.TABLE_NAME) {
    tableName = process.env.TABLE_NAME;
}

const dynamo = new Aws.DynamoDB.DocumentClient();
const Client = new Line.Client({channelAccessToken: channelAccessToken});

exports.handler = async(event: any) => {
    console.log(JSON.stringify(event));
    let body = JSON.parse(event.body);
    let replyToken:string = body.events[0].replyToken;

    // 商品メニューを要求された時の処理
    if (body.events[0].message.text == 'menu') {
        let data = await rp.get(apiDomain + 'prd/items').promise();
        let menuList = JSON.parse(data);
        let menu: {productName: string, Attributes: string}[] = menuList.Items;
        console.log(menu);

        let columns: Line.TemplateColumn[] = [];
        for (let i = 0; i<menu.length; i++) {
            let attributes = JSON.parse(menu[i].Attributes);
            columns[i] = {
                thumbnailImageUrl: imgDomain + attributes.image,
                title: menu[i].productName,
                text: attributes.price + '円',
                actions: [
                    {
                        type: 'message',
                        label: menu[i].productName + 'を購入する',
                        text: menu[i].productName
                    }
                ]
            }
        }

        let template:Line.TemplateCarousel = {
            type: 'carousel',
            columns: columns
        };
        let message:Line.TemplateMessage[] = [{
            type: 'template',
            altText: 'Menu List',
            template: template
        }];
        console.log(JSON.stringify(message));

        let result = await Client.replyMessage(replyToken, message);
        console.log(JSON.stringify(result));
    } else if (body.events[0].message.text == '紅茶' || 'コーヒー' || '緑茶') {
        let url = apiDomain + 'prd/item?productName=' + encodeURI(body.events[0].message.text);
        let data = await rp.get(url).promise();; //APIで選択した商品情報引いてくる
        let productAttributes = JSON.parse(data);
        let product = JSON.parse(productAttributes.Item.Attributes);
        console.log(product);

        let paymentUrl = 'https://sandbox-api-pay.line.me/v2/payments/request';
        let paymentInfo = {
            productName: body.events[0].message.text,
            amount: product.price,
            currency: 'JPY',
            confirmUrl: apiDomain + 'prd/confirm',
            confirmUrlType: 'SERVER',
            orderId: body.events[0].source.userId + replyToken
        }
        console.log(paymentInfo);

        let options:rp.OptionsWithUrl = {
            url: paymentUrl,
            body: JSON.stringify(paymentInfo),
            headers: {
                'Content-Type': 'application/json',
                'X-LINE-ChannelId': channelId,
                'X-LINE-ChannelSecret': channelSecret
            }
        }
        let paymentData = await rp.post(paymentUrl, options).promise();
        let paymentAttributes = JSON.parse(paymentData);
        let transactionId:string = paymentAttributes.info.transactionId.toString();

        console.log('Request LINE PAY Server.');
        console.log('------------');
        console.log(paymentData);
        console.log('------------');

        let Attributes:string = JSON.stringify({
            lineUserId: body.events[0].source.userId,
            productName: body.events[0].message.text,
            amount: product.price,
            orderId: body.events[0].source.userId + replyToken,
            paymentAccessToken: paymentAttributes.info.paymentAccessToken,
            transactionId: transactionId
        });

        let param:Aws.DynamoDB.DocumentClient.PutItemInput = {
            TableName: tableName,
            Item: {
                transactionId: body.events[0].source.userId + replyToken,
                Attributes: Attributes
            }
        };

        console.log(param);

        let putData:Aws.DynamoDB.DocumentClient.PutItemOutput = await dynamo.put(param).promise();
        console.log(JSON.stringify(putData));
        
        let message:Line.TemplateMessage[] = [{
            type: 'template',
            altText: 'Buy Product',
            template: {
                type: 'buttons',
                title: body.events[0].message.text,
                text: product.price + '円',
                actions: [{
                    type: 'uri',
                    label: 'LINE Payで購入する',
                    uri: paymentAttributes.info.paymentUrl.web
                }]
            }
        }];
        console.log(JSON.stringify(message));

        let result = await Client.replyMessage(replyToken, message);
        console.log(JSON.stringify(result));
    } else {
        let message:Line.TextMessage[] = [{
            type: 'text',
            text: 'Hello, World.'
        }];    
        let result = await Client.replyMessage(replyToken, message);
        console.log(JSON.stringify(result));
    }
    return { statusCode: 200 };
}
