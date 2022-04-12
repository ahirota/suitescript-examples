define(["N/search", "N/ui/serverWidget", "N/url", "N/record", "N/log"], function (search, ui, url, record, log) {
    /**
     * Input Sales Orders Reference Numbers and Search.
     *
     * @NApiVersion 2.x
     * @NModuleScope SameAccount
     * @NScriptType Suitelet
     */
    var exports = {};

    /**
     * <code>onRequest</code> event handler
     *
     * @governance @
     *
     * @param context
     *        {Object}
     * @param context.request
     *        {ServerRequest} The incoming request object
     * @param context.response
     *        {ServerResponse} The outgoing request object
     *
     * @return {void}
     *
     * @static
     * @function onRequest
     */
    function onRequest(context) {
        log.audit({ title: "Request Received." });

        // Fill out Form
        if (context.request.method === 'GET') {
            context.response.writePage({
                pageObject: renderForm()
            });
        }
        // Form Submitted
        else {
            // Error Handling
            if (!context.request.parameters.orderrefnumbers) {
                var refNumbers = [];
            }
            // Newline deliniated list of PO Numbers as entry
            else {
                var base = context.request.parameters.orderrefnumbers;
                base = base.split("\r\n");

                var refNumbers = [];

                for (var index = 0; index < base.length; index++) {
                    refNumbers.push(base[index].trim());
                }
            }
            log.audit({ title: "Reference Numbers", details: refNumbers });
            // DisplayList
            context.response.writePage({
                pageObject: renderList(translate(itemShipSearch(refNumbers)))
            });
        }
    }

    // Form Builder
    function renderForm() {
        log.audit({ title: "Rendering Input Form" });
        var form = ui.createForm({ title: "Multiple PO Reference Number Search" });

        form.addPageLink({
            type: ui.FormPageLinkType.CROSSLINK,
            title: "List",
            url: "/app/accounting/transactions/transactionlist.nl?Transaction_TYPE=ItemShip"
        });

        form.addPageLink({
            type: ui.FormPageLinkType.CROSSLINK,
            title: "Search",
            url: "/app/common/search/search.nl?searchtype=Transaction&Transaction_TYPE=ItemShip"
        });

        form.addField({
            id: 'orderrefnumbers',
            label: 'PO Ref Numbers',
            type: ui.FieldType.TEXTAREA
        });

        form.addSubmitButton({
            label: 'Search'
        });

        return form;
    }

    // List Builder
    function renderList(results) {
        log.audit({ title: 'Rendering List Results' });

        var list = ui.createList({ title: "Multi PO Number Item Shipping Search Results" });

        list.addPageLink({
            type: ui.FormPageLinkType.CROSSLINK,
            title: "List",
            url: "/app/accounting/transactions/transactionlist.nl?Transaction_TYPE=ItemShip"
        });
        list.addPageLink({
            type: ui.FormPageLinkType.CROSSLINK,
            title: "Search",
            url: "/app/common/search/search.nl?searchtype=Transaction&Transaction_TYPE=ItemShip"
        });

        list.addColumn({
            id: "tranid",
            type: ui.FieldType.URL,
            label: "REF. NO."
        }).setURL({
            url: getBaseUrl()
        }).addParamToURL({
            param: "id",
            value: "internalid",
            dynamic: true
        });
        list.addColumn({
            id: "trandate",
            type: ui.FieldType.TEXT,
            label: "Date"
        });
        list.addColumn({
            id: "location",
            type: ui.FieldType.TEXT,
            label: "Location"
        });
        list.addColumn({
            id: "entity",
            type: ui.FieldType.TEXT,
            label: "Name"
        });
        list.addColumn({
            id: "otherrefnum",
            type: ui.FieldType.TEXT,
            label: "PO Number"
        });

        list.addColumn({
            id: "custcol_list_item_name",
            type: ui.FieldType.TEXT,
            label: "List Item Name"
        });
        list.addColumn({
            id: "custcol_list_item_number",
            type: ui.FieldType.TEXT,
            label: "List Item Number"
        });
        list.addColumn({
            id: "createdfromname",
            type: ui.FieldType.URL,
            label: "Sales Order"
        }).setURL({
            url: getSOUrl()
        }).addParamToURL({
            param: "id",
            value: "createdfrom",
            dynamic: true
        });
        list.addRows({ rows: results });
        return list;
    }

    // Search Builder
    function itemShipSearch(refNumbers) {
        log.audit({ title: "Item Shipment" });

        var filters = [];
        for (var index = 0; index < refNumbers.length; index++) {
            if (filters.length > 0) {
                filters.push("OR")
            }
            filters.push(["createdfrom.poastext", "is", refNumbers[index]])
        }

        return search.create({
            type: search.Type.TRANSACTION,
            columns: [
                search.createColumn({ name: "tranid", label: "Ref. No" }),
                search.createColumn({ name: "type", label: "Type" }),
                search.createColumn({
                    name: "trandate",
                    sort: search.Sort.DESC,
                    label: "Date"
                }),
                search.createColumn({ name: "location", label: "Location" }),
                search.createColumn({ name: "entity", label: "Name" }),
                search.createColumn({
                    name: "otherrefnum",
                    join: "createdFrom",
                    label: "PO/Cheque Number"
                }),
                search.createColumn({ name: "custcol_list_item_name", label: "List Item Name" }),
                search.createColumn({ name: "custcol_list_item_number", label: "List Item Number" }),
                search.createColumn({ name: "createdfrom", label: "Created From" })
            ],
            filters: [
                ["type", "anyof", "ItemShip"],
                "AND",
                ["mainline", "is", "F"],
                "AND",
                filters
            ]
        }).run().getRange({ start: 0, end: 1000 });
    }

    // Search result map
    function mapResult(result) {
        log.audit({ title: "Result", details: result });

        return {
            tranid: result.getValue({ name: 'tranid' }),
            internalid: result.id,
            trandate: result.getValue({ name: 'trandate' }),
            location: result.getText({ name: 'location' }),
            entity: result.getText({ name: 'entity' }),
            otherrefnum: result.getValue({ name: 'otherrefnum', join: 'createdFrom' }),
            custcol_list_item_name: result.getValue({ name: 'custcol_list_item_name' }),
            custcol_list_item_number: result.getValue({ name: 'custcol_list_item_number' }),
            createdfrom: result.getValue({ name: 'createdfrom' }),
            createdfromname: result.getText({ name: 'createdfrom' })
        };
    }

    // Result Map to object
    function translate(results) {
        return results.map(mapResult);
    }

    // Get Record Type for Dynamic Link
    function getBaseUrl() {
        return url.resolveRecord({
            recordType: search.Type.ITEM_FULFILLMENT
        });
    }

    // Get Record Type for Dynamic Link
    function getSOUrl() {
        return url.resolveRecord({
            recordType: search.Type.SALES_ORDER
        });
    }

    exports.onRequest = onRequest;
    return exports;
});