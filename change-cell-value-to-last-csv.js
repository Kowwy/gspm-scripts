let table = await input.tableAsync("Pick a table");
let view = await input.viewAsync("Pick a view", table);
let field = await input.fieldAsync("Pick a field", table);

let queryResult = await view.selectRecordsAsync({
  fields: [field],
});

let values = [];

for (let record of queryResult.records) {
  let originalValue = record.getCellValue(field);
  if (!originalValue) continue;

  let cellValues = originalValue.split(",");
  if (cellValues.length < 2) continue;

  let newValue = cellValues.pop();
  values.push({
    record,
    originalValue,
    newValue,
  });
}

output.markdown("## Replacements");
output.table(values);
let shouldReplace = await input.buttonsAsync("Make updates?", [
  { label: "Yes", variant: "danger" },
  { label: "Cancel" },
]);

if (shouldReplace === "Yes") {
  let updates = values.map((replacement) => ({
    id: replacement.record.id,
    fields: {
      [field.id]: replacement.newValue,
    },
  }));

  while (updates.length > 0) {
    await table.updateRecordsAsync(updates.slice(0, 50));
    updates = updates.slice(50);
  }
}
