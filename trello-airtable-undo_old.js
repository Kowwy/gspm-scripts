let table = base.getTable("Fumigation Actions");
let trelloData = input.config();

let fumeActions = trelloData.actions;
let trelloCardId = trelloData.trellocard;
let boardId = trelloData.boardId;

async function getFumeAction(recordId) {
  let record = await table.selectRecordAsync(recordId);
  return record?.name;
}

function formatRecordIds(recordIds) {
  let arrayFromRecordIds = recordIds
    .replace(/"/g, "")
    .split(",")
    .filter((record) => {
      return record != "";
    });
  return arrayFromRecordIds;
}

async function deleteLastRecord(recordId) {
  try {
    await table.deleteRecordAsync(`${recordId}`);
  } catch (err) {
    console.log(err);
  }
}

function formatTrelloRequestData(recordsToReturn) {
  let formattedRecords = "";
  if (recordsToReturn.length > 0) {
    for (let i = recordsToReturn.length - 1; i >= 0; i--) {
      formattedRecords = `"${recordsToReturn[i]}",${formattedRecords}`;
    }
  }
  return formattedRecords;
}

async function undo(trelloActions) {
  let recordIds = formatRecordIds(trelloActions);
  let lastRecord = recordIds.pop();
  let actionInfo = await getFumeAction(lastRecord);
  await deleteLastRecord(lastRecord);
  let actionsToReturn = formatTrelloRequestData(recordIds);
  let fields = await trelloApi.getCustomFields(boardId);
  let field = getCustomFieldByName("actions", fields);
  let trelloUndo = await trelloApi.updateCustomField(
    trelloCardId,
    field.id,
    actionsToReturn
  );
  let comment = await trelloApi.postComment(
    trelloCardId,
    `Deleted Airtable Record: \n${actionInfo}`
  );
  console.log(comment);
}

function getCustomFieldByName(fieldName = "", boardFields = []) {
  for (let field of boardFields) {
    if (field.name == fieldName) return field;
  }
  return {};
}

const trelloApi = {
  apiKey: "c3c9442e3d79383422738dad2693aba1",
  apiToken: "c2837107fb17c674569042f4e1ee3e55f6a0e113c34eb95c174e4fd5f266cf08",
  baseUrl: "https://api.trello.com/1",

  get authString() {
    return `key=${this.apiKey}&token=${this.apiToken}`;
  },

  async getCustomFields(boardId) {
    let url = `${this.baseUrl}/boards/${boardId}/customFields?${this.authString}`;
    let res = await fetch(url, { method: "GET" });
    return res.json();
  },

  async updateCustomField(cardId = "", fieldId = "", newFieldValue = "") {
    let url = `${this.baseUrl}/cards/${cardId}/customField/${fieldId}/item?${this.authString}`;
    let data = {
      value: {
        text: newFieldValue,
      },
    };
    let res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res;
  },

  async postComment(cardId = "", comment = "") {
    comment = encodeURI(comment);
    let url = `${this.baseUrl}/cards/${cardId}/actions/comments?text=${comment}&${this.authString}`;
    let res = await fetch(url, {
      method: "POST",
      headers: { Accept: "application/json" },
    });
    return res;
  },
};

if (trelloData.actions != "") {
  await undo(trelloData.actions);
} else {
  console.log("No actions to undo");
}
