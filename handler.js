const AWS = require("aws-sdk");
const express = require("express");
const serverless = require("serverless-http");
const { v4: uuidv4 } = require('uuid');

const app = express();

const FORMS_TABLE = process.env.FORMS_TABLE;
const dynamoDbClient = new AWS.DynamoDB.DocumentClient();

app.use(express.json());

app.get("/forms", async function (req, res) {
  const params = {
    TableName: FORMS_TABLE,
    IndexName: "userId-templateId-index",
    KeyConditionExpression: "userId = :userId and templateId = :templateId",
    ExpressionAttributeValues: {
      ":userId": req.query.userId,
      ":templateId": req.query.templateId,
    },
  };

  try {
    const {Items} = await dynamoDbClient.query(params).promise();
    console.log('Items', Items)
    if (Items) {
      res.json(Items);
    } else {
      res
        .status(404)
        .json({ error: 'Could not find user with provided "userId"' });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Could not retreive user" });
  }
});

app.get("/forms/:documentId", async function (req, res) {
  console.log('req.params.documentId', req.params.documentId)

  const params = {
    TableName: FORMS_TABLE,
    KeyConditionExpression: "documentId = :documentId",
    ExpressionAttributeValues: {
      ":documentId": req.params.documentId,
    },
  };

  console.log('params', params)
  try {
    const result = await dynamoDbClient.query(params).promise();
    if (result.Items) {
      res.json(result.Items[0]);
    } else {
      res
        .status(404)
        .json({ error: 'Could not find user with provided "userId"' });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Could not retreive user" });
  }
});


app.post("/forms", async function (req, res) {
  console.log('/forms body', req.body)
  const { userId, templateId, formVersion, attributes } = req.body;

  const params = {
    TableName: FORMS_TABLE,
    Item: {
      documentId: uuidv4(),
      userId: userId,
      templateId: templateId, 
      formVersion: formVersion,
      attributes: attributes
    },
  };

  try {
    await dynamoDbClient.put(params).promise();
    res.status(201);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Could not create user" });
  }
});


app.put("/forms/:documentId", async function (req, res) {
  console.log('/forms body', req.body)
  console.log('req.params.documentId', req.params.documentId)
  
  const { userId, templateId, formVersion, attributes } = req.body;

  const params = {
    TableName: FORMS_TABLE,
    UpdateExpression: 'SET userId = :userId, templateId = :templateId, formVersion = :formVersion, attributes = :attributes',
    KeyConditionExpression: "documentId = :documentId",
    ExpressionAttributeValues: {
      ":documentId": req.params.documentId,
      ":userId": userId,
      ":templateId": templateId,
      "formVersion": formVersion,
      "attributes": attributes
    },
  };
  try {
    await dynamoDbClient.update(params).promise();
    res.status(201);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
});


app.delete("/forms/:documentId", async function (req, res) {
  console.log('req.params.documentId', req.params.documentId)

  const id = req.params.documentId

  const params = {
    TableName: FORMS_TABLE,
    KeyConditionExpression: "documentId = :documentId",
    ExpressionAttributeValues: {
      ":documentId": req.params.documentId,
    },
  };

  console.log('params', params)
  try {
    const result = await dynamoDbClient.query(params).promise();
    if (result.Items) {
      await dynamoDbClient.delete(params).promise();
      res.json({message: "Deletado"});
    } else {
      res
        .status(404)
        .json({ error: 'Could not find user with provided "userId"' });
    }   
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
});



app.options('*', async function (req, res) {
    console.log('options:', req.headers.origin);
    res.set({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.status(200);
});

app.use((req, res, next) => {
  return res.status(404).json({
    error: "Not Found",
  });
});


module.exports.handler = serverless(app);
