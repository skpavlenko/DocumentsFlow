DocsList = new Mongo.Collection('docs');
DocFlow = new Mongo.Collection('docflow');
ViewList = new Mongo.Collection('view');
ButtonsList = new Mongo.Collection('buttons');
DocumentDefinitionsList = new Mongo.Collection('definitions');
LayoutList = new Mongo.Collection('layout');

Meteor.methods({
	'initschema': function(){
	        //init
	        ViewList.remove({});
	        ViewList.insert({
	        	"header":{
	        		"rows":[
	        		{
	        			"columns":[
	        			{
	        				"_id": "cc4cb134-fda0-44d8-8e92-e42ebbceb415",
	        				"label": "Client Name",
	        				"name":"name",
	        				"type": "Text",
	        				"maxLength": 100
	        			},
	        			{
	        				"_id": "228b905f-4a43-4a40-b829-0c6a04ad4782",
	        				"label":"Client Age",
	        				"name": "age",
	        				"type": "number"
	        			}
	        			]
	        		}
	        		]
	        	},
	        	"buttons":[
	        	"save"
	        	]
	        });

	    },
   'init': function(){

	//init of fields
	DocFlow.remove({});
	var fieldsCount = ViewList.find().fetch()[0].header.rows[0].columns.length;
	for (var i = 0; i < fieldsCount; i++) {
	DocFlow.insert({
		"_id": ViewList.find().fetch()[0].header.rows[0].columns[i]._id,
		"label": ViewList.find().fetch()[0].header.rows[0].columns[i].label,
		"name": ViewList.find().fetch()[0].header.rows[0].columns[i].name,
		"type": ViewList.find().fetch()[0].header.rows[0].columns[i].type,
		"maxLength": +ViewList.find().fetch()[0].header.rows[0].columns[i].maxLength
	});
	};


	//init of buttons
	ButtonsList.remove({});
	var buttonsCount = ViewList.find().fetch()[0].buttons.length;
	for (var i = 0; i < buttonsCount; i++) {
	ButtonsList.insert({
		"label": ViewList.find().fetch()[0].buttons[i]
	});
	};

},'initdocdeflayout': function(){
	//init of fields
	DocFlow.remove({});
	var fieldsCount = LayoutList.find().fetch()[0].header.rows[0].columns.length;
	for (var i = 0; i < fieldsCount; i++) {
		var _idVar = LayoutList.find().fetch()[0].header.rows[0].columns[i]._id;
		var indexDDL = -1;
		for (var j = 0; j < fieldsCount; j++) {
			if (DocumentDefinitionsList.find().fetch()[0].schema.fields[j]._id.localeCompare(_idVar) == 0) {
				indexDDL = j;
				break;
			};
		}
		if(indexDDL != -1) {
			DocFlow.insert({
				"_id": _idVar,
				"label": DocumentDefinitionsList.find().fetch()[0].schema.fields[indexDDL].label,
				"name": DocumentDefinitionsList.find().fetch()[0].schema.fields[indexDDL].name,
				"type": DocumentDefinitionsList.find().fetch()[0].schema.fields[indexDDL].type,
				"maxLength": +DocumentDefinitionsList.find().fetch()[0].schema.fields[indexDDL].maxLength
			});
		};
	};


	//from Document Definitions and Layout
	//init of buttons
	ButtonsList.remove({});
	var buttonsCount = LayoutList.find().fetch()[0].buttons.length;
	for (var i = 0; i < buttonsCount; i++) {
	ButtonsList.insert({
		"label": LayoutList.find().fetch()[0].buttons[i]
	});
	};


}, 
'clearDDefLayout': function(){
	DocumentDefinitionsList.remove({});
	LayoutList.remove({});
}

});

if(Meteor.isServer){
	Meteor.call('initschema');
	Meteor.call('init');
};

if(Meteor.isClient){

	Template.docslist.helpers({
		'doc': function(){
			return DocsList.find();
		}, 
		'docscount': function(){
			return DocsList.find().count();
		},
		'selectedClass': function(){
			var docId = this._id;
			var selectedDoc = Session.get('selectedDoc');
			if(docId == selectedDoc){
				return "selected"
			}
		},
		'selectedDoc': function(){
			var selectedDoc = Session.get('selectedDoc');
			return DocsList.findOne({ _id: selectedDoc });
		},
		'fieldslist': function() {
			return DocFlow.find();
		},
		'getheader': function() {
			//получим строку таблицы
			var headStrVal = "";
			var fieldsList = DocFlow.find().fetch();
			var fieldsCount = DocFlow.find().count();
			for (var i = 0; i < fieldsCount; i++) {
				headStrVal = headStrVal + fieldsList[i].label + ((i<fieldsCount-1)?'....':'');
			}
			return headStrVal;
		},
		'getrow': function() {
			//получим строку таблицы
			var rowStrVal = "";
			var fieldsList = DocFlow.find().fetch();
			var fieldsCount = DocFlow.find().count();
			for (var i = 0; i < fieldsCount; i++) {
				rowStrVal = rowStrVal + fieldsList[i].label + " : " + this[fieldsList[i].name] + '; ';
			}
			return rowStrVal;
		}
	});

	Template.addDocForm.helpers({
		'fieldslist': function() {
			return DocFlow.find();
		},
		'buttonslist': function() {
			return ButtonsList.find();
		}
	});	

	Template.addDocForm.events({
		'submit form': function(event){
			event.preventDefault();
			var objToInsert = {};
			var fieldsList = DocFlow.find().fetch();
			var fieldsCount = DocFlow.find().count();
			for (var i = 0; i < fieldsCount; i++) {
				objToInsert[fieldsList[i].name]=event.target[fieldsList[i].name].value;
			};
			DocsList.insert(objToInsert);

			for (var i = 0; i < fieldsCount; i++) {
				event.target[fieldsList[i].name].value = "";
			};
		}
	});

	Template.docslist.events({
		'click .doc': function(){
			var docId = this._id;
			Session.set('selectedDoc', docId);
		},
		'click .remove': function(){
			if (confirm("Do you really want to remove a doc from list?")) {
				var selectedDoc = Session.get('selectedDoc');
				DocsList.remove({ _id: selectedDoc });};

			}
		});

	Template.addSchema.events({
		'submit form': function(event){
			event.preventDefault();
			var docId = ViewList.find().fetch()[0]._id;
			ViewList.update({ _id: docId }, JSON.parse(event.target.tview.value.replace(/\s+/g,' ')));
			Meteor.call('init');
		}
	});	

	Template.addDL.events({
		'submit form': function(event){
			event.preventDefault();
			
			Meteor.call('clearDDefLayout');

			//update Document Definitions			
			DocumentDefinitionsList.insert(
				JSON.parse(event.target.tddef.value.replace(/\s+/g,' ')));
			
			//update Layout
			LayoutList.insert(
			JSON.parse(event.target.tlayout.value.replace(/\s+/g,' ').replace(new RegExp('"fieldId"','g'),'"_id"')));
			//...
			Meteor.call('initdocdeflayout');
		}
	});
};