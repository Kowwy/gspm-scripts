const table = base.getTable("Fumigation Actions");
const config = input.config();

async function getFumeAction(recordId) {
  let record = await table.selectRecordAsync(recordId);
  return record?.name;
}

/*
Extracts record ids from Trello's 'actions' custom field format
Returns an array of record ids
*/
function formatRecordIdsFromTrello(recordIds) {
  let formattedIds = recordIds
    .replace(/"/g, "")
    .split(",")
    .filter((record) => {
      return record != "";
    });
  return formattedIds;
}

async function deleteLastFumeAction(recordId) {
  try {
    await table.deleteRecordAsync(`${recordId}`);
  } catch (err) {
    throw new Error("Could not delete last fume action");
  }
}

/*
Formats an array of record ids into the format required by the 'actions' custom field in Trello
Format, without parens - ("recordId1","recordId2","recordId3",)
Loops through ids in reverse, as to keep proper order
*/
function formatActionIdsForTrello(recordIdArr) {
  let formattedRecords = "";
  if (recordIdArr.length > 0) {
    for (let i = recordIdArr.length - 1; i >= 0; i--) {
      formattedRecords = `"${recordIdArr[i]}",${formattedRecords}`;
    }
  }
  return formattedRecords;
}

function searchCustomFieldByName(fieldName = "", boardFields = []) {
  for (let field of boardFields) {
    if (field.name == fieldName) return field;
  }
  return {};
}

const trelloApi = {
  baseUrl: "https://api.trello.com/1",

  get apiKey() {
    return config.TRELLO_API_KEY;
  },

  get apiToken() {
    return config.TRELLO_API_TOKEN;
  },

  get authString() {
    return `key=${this.apiKey}&token=${this.apiToken}`;
  },

  async getCustomFields(boardId) {
    const url = `${this.baseUrl}/boards/${boardId}/customFields?${this.authString}`;
    try {
      let res = await fetch(url, { method: "GET" });
      return res.json();
    } catch (err) {
      throw new Error("Could not get custom fields");
    }
  },

  async updateCustomField(cardId = "", fieldId = "", newFieldValue = "") {
    const url = `${this.baseUrl}/cards/${cardId}/customField/${fieldId}/item?${this.authString}`;
    const body = {
      value: {
        text: newFieldValue,
      },
    };
    try {
      let res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return res;
    } catch (err) {
      throw new Error("Could not update custom field");
    }
  },

  async postComment(cardId = "", comment = "") {
    const encodedComment = encodeURI(comment);
    const url = `${this.baseUrl}/cards/${cardId}/actions/comments?text=${encodedComment}&${this.authString}`;
    try {
      let res = await fetch(url, {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      return res;
    } catch (err) {
      throw new Error("Could not post comment");
    }
  },
};

async function undo(actionsFromTrello) {
  let recordIds = formatRecordIdsFromTrello(actionsFromTrello);
  let lastActivity = recordIds.pop();
  let actionInfo = await getFumeAction(lastActivity);
  await deleteLastFumeAction(lastActivity);
  let actionsToReturn = formatActionIdsForTrello(recordIds);
  let trelloCustomFields = await trelloApi.getCustomFields(
    config.trelloBoardId
  );
  let actionsField = searchCustomFieldByName("actions", trelloCustomFields);
  let trelloUndo = await trelloApi.updateCustomField(
    config.trelloCard,
    actionsField.id,
    actionsToReturn
  );
  let comment = await trelloApi.postComment(
    config.trelloCard,
    `Deleted Airtable Record: \n${actionInfo}`
  );
}

if (config.actionIds != "") {
  await undo(config.actionIds);
} else {
  console.log("No actions to undo");
}
