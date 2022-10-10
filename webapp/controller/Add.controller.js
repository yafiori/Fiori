sap.ui.define([
    "sap/ui/core/mvc/Controller",
    'sap/ui/model/json/JSONModel',
    'sap/m/MessageToast',
    'sap/m/MessageBox',
    'sap/ui/core/Fragment',
    'sap/m/DisplayListItem'
], function(Controller, JSONModel, MessageToast, MessageBox, Fragment, DisplayListItem) {
    'use strict';
    return Controller.extend("ats.fin.ar.controller.Add",{
        onInit: function(){

            var oJSONModel = new JSONModel();
            //local model with already tested payload which needs to be
            //sent to odata service
            oJSONModel.setData({
                "prodData": {
                    "PRODUCT_ID" : "",
                    "TYPE_CODE" : "PR",
                    "CATEGORY" : "Notebooks",
                    "NAME" : "",
                    "SUPPLIER_ID" : "0100000051",
                    "SUPPLIER_NAME" : "TECUM",
                    "DESCRIPTION" : "",
                    "PRICE" : "0.00",
                    "CURRENCY_CODE" : "EUR"            
                            }
            });
            this.getView().setModel(oJSONModel, "zkas");
            this.oLocalModel = oJSONModel;
            this.setMode("Create");
        },
        mode: "Create",
        prodId: "",
        onClear: function(){
            this.oLocalModel.setData({
                "prodData": {
                    "PRODUCT_ID" : "",
                    "TYPE_CODE" : "PR",
                    "CATEGORY" : "Notebooks",
                    "NAME" : "",
                    "SUPPLIER_ID" : "0100000051",
                    "SUPPLIER_NAME" : "TECUM",
                    "DESCRIPTION" : "",
                    "PRICE" : "0.00",
                    "CURRENCY_CODE" : "EUR"                   
                   
                }
            });
            this.setMode("Create");
        },
        oSupplierPopup: null,
        onConfim: function(oEvent){
                //Step 1: Get the selected item data
                var oSelItem = oEvent.getParameter("selectedItem");
                //Step 2: Get The data of selecte item
                var sData = oSelItem.getValue();
                //Step 3: The object of the input field - set data
                this.oLocalModel.setProperty("/prodData/SUPPLIER_ID", sData);
                this.oLocalModel.setProperty("/prodData/SUPPLIER_NAME", oSelItem.getLabel());
        },
        onF4Supplier: function(oEvent){
            //EXercise: Create a global object for citi popup and 
            //          build fragment object with cities title as another popup
            var that = this;
            if(!this.oSupplierPopup){
                Fragment.load({
                    fragmentName: 'ats.fin.ar.fragments.popup',
                    type: 'XML',
                    id: 'supplier',
                    controller: this
                }).then(function(oFragment){
                    that.oSupplierPopup = oFragment;
                    that.getView().addDependent(that.oSupplierPopup);
                    that.oSupplierPopup.setTitle("Select Supplier");
                    that.oSupplierPopup.setMultiSelect(false);
                    that.oSupplierPopup.bindAggregation("items",{
                        path: '/SupplierSet',
                        template: new DisplayListItem({
                            label: '{COMPANY_NAME}',
                            value: '{BP_ID}'
                        })
                    });
                    that.oSupplierPopup.open();
                });
            }else{
                that.oSupplierPopup.open();
            }
        },
        setMode: function(sMode){
            this.mode = sMode;
            if(sMode === "Create"){
                this.getView().byId("name").setEnabled(true);
                this.getView().byId("idSave").setText("Save");
                this.getView().byId("idDelete").setEnabled(false);
                
            }else{
                this.getView().byId("name").setEnabled(false);
                this.getView().byId("idSave").setText("Update");
                this.getView().byId("idDesc").focus();
                this.getView().byId("idDelete").setEnabled(true);
            }   
        },
        onDelete: function(){
            //Step 1: get odata model object
            var oDataModel = this.getView().getModel();
            //Step 2: call delete - remove
            var that = this;
            oDataModel.remove("/ProductSet('" + this.prodId + "')",{
                success: function(){
                    //Step 3: handle callback
                    MessageToast.show("Delete is now finised 😁");
                    that.onClear();
                }
            });
            
        },
        onLoadExpensive: function(){
            //Step 1: Get the ODataModel object
            var oDataModel = this.getView().getModel();
            //Step 2: Call function import in Odata
            var that = this;
            oDataModel.callFunction("/GetMostExpensiveProduct",{
                urlParameters:{
                    "I_CATEGORY": this.getView().byId("category").getSelectedKey()
                },
                success: function(data){
                    //Step 3: Success response - set this to local model
                    that.oLocalModel.setProperty("/prodData",data);
                    that.prodId = data.PRODUCT_ID;
                    that.setMode("Edit");
                }
            });
            //Step 3: Handle response, set local model, change mode to edit
        },
        onLoadSingle: function(oEvent){
            //Step 1: Get the id of the product entered by user
            this.prodId = oEvent.getSource().getValue();
            this.prodId = this.prodId.toUpperCase();
            oEvent.getSource().setValue(this.prodId);
            //Step 2: Send a GET SINGLE call to our OData using model
            var oDataModel = this.getView().getModel();
            //We cannot access this pointer inside callback so we
            //create a local variable in function which can be accessed
            //as 'this' inside callbacks
            var that = this;
            oDataModel.read("/ProductSet('" + this.prodId + "')",{
                success: function(data){
                    //Step 3: Success response - set this to local model
                    that.oLocalModel.setProperty("/prodData",data);
                    that.setMode("Edit");
                },
                error: function(){
                    //Step 4: Handle error 
                    MessageToast.show("The product does not exist")
                    that.setMode("Create");
                }
            });
        },
        onSave: function(){
            //Step 1 : prepare payload and perform pre-checks
            var payload = this.oLocalModel.getProperty("/prodData");
            if(!payload.PRODUCT_ID || !payload.NAME){
                MessageBox.error("Dude, please enter correct data");
                return;
            }
            //Step 2 : get the Odata model object
            var oDataModel = this.getView().getModel();
            //Step 3 : trigger the POST request to send data from firoi app to sap 
            if(this.mode === "Create"){
                oDataModel.create("/ProductSet",payload,{
                    //Step 4 : Handle call backs - if save was success
                    success: function(){
                        MessageToast.show("The Record have been saved to SAP S/4HANA");
                    },
                    //Step 4 : Handle call backs - if save failed in SAP
                    error: function(oError){
                        var errorMessage = JSON.parse(oError.responseText).error.innererror.errordetails[0].message;
                        MessageBox.error("oops! save has been rejected Error: " + errorMessage );
                    }
                });
            }else{
                oDataModel.update("/ProductSet('" + this.prodId + "')",payload,{
                    //Step 4 : Handle call backs - if save was success
                    success: function(){
                        MessageToast.show("The Record have been updated to SAP S/4HANA");
                    },
                    //Step 4 : Handle call backs - if save failed in SAP
                    error: function(oError){
                        var errorMessage = JSON.parse(oError.responseText).error.innererror.errordetails[0].message;
                        MessageBox.error("oops! save has been rejected Error: " + errorMessage );
                    }
                });
            }
            
            
        }
    });
});