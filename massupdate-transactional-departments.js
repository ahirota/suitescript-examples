/**
 * @NApiVersion 2.x
 * @NScriptType MassUpdateScript
 * Mass Update Transactional Record Departments based on if Sales or related record was created after input date.
 * Use Case: Same inventory items; however, Fiscal Year has changed department names due to restructuring
 */
define(['N/record', 'N/runtime', 'N/log', 'N/error'], function (record, runtime, log, error) {
    // Main Function
    function processRecord(context) {
        log.debug({
            title: 'Update Start',
            details: 'Record with ID: [' + context.id + '] and type: [' + context.type + '] has Started'
        });

        var departmentId = runtime.getCurrentScript().getParameter({ name: 'custscript_new_department' });

        var datechange = runtime.getCurrentScript().getParameter({ name: 'custscript_date_change' });

        var currentRecord = record.load({ type: context.type, id: context.id });

        if (context.type === record.Type.SALES_ORDER) {
            log.debug({
                title: 'SALES ORDER Start',
                details: 'Sales Order Update Start'
            });
            updateDepartment(currentRecord, departmentId);
            updateItemSublistDepartment(currentRecord, departmentId);
            currentRecord.save();
            updateRelatedRecords(currentRecord, departmentId, datechange);
            log.debug({
                title: 'SALES ORDER End',
                details: 'Sales Order Update End'
            });
        }
        else if (context.type === record.Type.ITEM_FULFILLMENT) {
            log.debug({
                title: 'ITEM FULFILLMENT Start',
                details: 'Item Fulfillment Update Start'
            });

            var createdFromRecord = record.load({ type: record.Type.SALES_ORDER, id: currentRecord.getValue({ fieldId: 'createdfrom' }) });

            updateRelatedRecords(createdFromRecord, departmentId, datechange);
            log.debug({
                title: 'ITEM FULFILLMENT End',
                details: 'Item Fulfillment Update End'
            });
        }
        else {
            throw error.create({
                name: 'INVALID TYPE',
                message: 'Record with ID: [' + context.id + '] has unsupported type: [' + context.type + '] for this Mass Update'
            });
        }

        log.debug({
            title: 'Update End',
            details: 'Ending Record Update'
        });
    }

    // Helper Functions
    function updateDepartment(currentRecord, departmentId) {
        // Check Department ID
        var recordDepartment = currentRecord.getValue({ fieldId: 'department' });

        // Update if different
        if (recordDepartment !== departmentId) {
            log.debug({
                title: 'Update Department',
                details: 'Record with ID: [' + currentRecord.id + '] department updated: [' + recordDepartment + ' -> ' + departmentId + ']'
            });
            currentRecord.setValue({ fieldId: 'department', value: departmentId });
        }
        else {
            log.debug({
                title: 'Update Department (PASS)',
                details: 'Record with ID: [' + currentRecord.id + '] already has department: [' + recordDepartment + ']'
            });
        }
    }

    function updateItemSublistDepartment(currentRecord, departmentId) {
        log.debug({
            title: 'Update Item Sublist Start',
            details: 'Starting Item Sublist Update'
        });

        // Start Sublist Items Loop
        var numitems = currentRecord.getLineCount({ sublistId: 'item' });
        for (var i = 0; i < numitems; i++) {
            try {
                var itemDepartment = currentRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'department',
                    line: i
                });

                currentRecord.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'department',
                    line: i,
                    value: departmentId
                });

                log.debug({
                    title: 'Update Department',
                    details: 'Sublist Line Item department updated: [' + itemDepartment + ' -> ' + departmentId + ']'
                });
            }
            catch (e) {
                log.error({
                    title: 'Update Item Sublist Error',
                    details: 'Sublist Line Item on line: [' + i + '] unable to update field: [department]'
                });
            }
        }

        log.debug({
            title: 'Update Item Sublist End',
            details: 'End Item Sublist Update'
        });
    }

    function updateRelatedRecords(currentRecord, departmentId, datechange) {
        log.debug({
            title: 'Update Related Record Sublist Start',
            details: 'Starting Related Record Sublist Update'
        });

        // Variable initializer
        var sublistRecord = null;

        // Start Sublist Items Loop
        var relatedCount = currentRecord.getLineCount({ sublistId: 'links' });

        for (var i = 0; i < relatedCount; i++) {
            // Type Name is translated into Executing Users Language, your script will fail if not correct translation.
            // For Example in Japanese: Item Fulfillment -> 配送
            if (currentRecord.getSublistValue({ sublistId: "links", fieldId: "type", line: i }) === 'Item Fulfillment') {
                log.debug({
                    title: 'Update Item Fulfillment Start',
                    details: 'Starting Item Fulfillment Update'
                });

                sublistRecord = record.load({ type: record.Type.ITEM_FULFILLMENT, id: currentRecord.getSublistValue({ sublistId: "links", fieldId: "id", line: i }) });

                if (new Date(sublistRecord.getValue({ fieldId: 'trandate' })) < new Date(datechange)) {
                    log.debug({
                        title: 'Update Item Fulfillment (Before Date Change)',
                        details: 'End Item Fulfillment Update (Before Date Change)'
                    });
                    continue;
                }

                updateItemSublistDepartment(sublistRecord, departmentId);
                sublistRecord.save();
                log.debug({
                    title: 'Update Item Fulfillment End',
                    details: 'End Item Fulfillment Update'
                });
            }
            else if (currentRecord.getSublistValue({ sublistId: "links", fieldId: "type", line: i }) === 'Invoice') {
                log.debug({
                    title: 'Update Invoice Start',
                    details: 'Starting Invoice Update'
                });
                sublistRecord = record.load({ type: record.Type.INVOICE, id: currentRecord.getSublistValue({ sublistId: "links", fieldId: "id", line: i }) });

                if (new Date(sublistRecord.getValue({ fieldId: 'trandate' })) < new Date(datechange)) {
                    log.debug({
                        title: 'Update Invoice End (Before Date Change)',
                        details: 'End Invoice Update (Before Date Change)'
                    });
                    continue;
                }

                updateDepartment(sublistRecord, departmentId);
                updateItemSublistDepartment(sublistRecord, departmentId);
                sublistRecord.save();
                log.debug({
                    title: 'Update Invoice End',
                    details: 'End Invoice Update'
                });
            }
            else {
                log.error({
                    title: 'Update Related Record Sublist Error',
                    details: 'Related Record with ID: [' + currentRecord.getSublistValue({ sublistId: "links", fieldId: "id", line: i }) + '] has unsupported type: [' + currentRecord.getSublistValue({ sublistId: "links", fieldId: "type", line: i }) + '] for this Mass Update'
                });
            }
        }

        log.debug({
            title: 'Update Related Record Sublist End',
            details: 'End Related Record Sublist Update'
        });
    }

    // Function Call
    function each(context) {
        try {
            processRecord(context);
        }
        catch (e) {
            log.error('Error Updating: Record with ID: [' + context.id + '] and Type: [' + context.type + ']', e);
        }
    }

    return {
        each: each
    };
});