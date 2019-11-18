// OC Audit Sitemap updater (OmniMapper)
// by Scott Fleming
// -- updates the sitemap array with fresh sitemap data for each customer
// ======================================================================

const mongoose = require('mongoose');
	  mongoose.set('useCreateIndex', true); // Deprecation Warning suppressor
	  mongoose.set('useFindAndModify', false);
const parseXml = require('xml2js').parseString;
const axios = require('axios');
const keys = require('./config');
// Importing Mongoose models
require('./customer.model');

const Customer 	= require('mongoose').model('Customer');

const run = async (customers) => {
    for(let customer of customers) {

        let myCustomer = {
            name: customer.name,
            url: customer.url,
            email: customer.email
        }
		
		 sitemapper(myCustomer);
			
        
	}
	

} // run func(customers)


const sitemapper = async (myCustomer) => {
    let url = myCustomer.url;
   
	// console.log(`Axios call: ${url}...`);

    axios.get(`https://${url}/sitemap.xml`)
    .then(res => res.data)
    .then(xml => {
        parseXml(xml, (err, sitemapArray) => {
			processXML(sitemapArray.urlset.url, myCustomer);
        });
    }).catch( 
        function(error) {
            console.log(`Axios.get: ${error}`);
    });
}

const processXML = async function(array, customer) {

	customer.sitemap = [];
    
    let filter = {url: customer.url}
		
	// console.log(`Processing ${customer.url} `); 

	let sitemap =  await array.map(async (el) => {
		let lastChange 	= "";
		let assets 		= [];
		const source 	= axios.CancelToken.source();

		const content = await axios.get( el.loc[0]+'/?format=json')
			.then(res => res.data)
			.then(data =>  {
				
				lastChange = data.collection.updatedOn;

				if(data.collection.typeName === "index") {
					assets = data.collection.collections.map(col => col.mainImage ? col.mainImage.assetUrl: null);
					return data.collection.collections.map(col => col.mainContent).join("<br><br>");
				} else if(data.collection.typeName === "page") {
					assets = data.collection.mainImage ? data.collection.mainImage.assetUrl : null;
					return data.mainContent;
				}
			}).catch(thrown => {
				if(axios.isCancel(thrown)){
					console.log(thrown.message);
				}else{
					// handle the error here
				}
			});
			
			source.cancel('Request Cancelled.');

		return {
			loc : el.loc[0],
			lastChange: lastChange,
			content: content,
			assets: assets
		}
		});
		
	Promise.all(sitemap).then(results => {
        customer.sitemap = results.filter(res => res.content);
        let doc =  Customer.findOneAndUpdate( filter, {sitemap : customer.sitemap}, {new: true, upsert: true} ).then((object) => {
			console.log(`${customer.name} completed ${object.updatedAt.toISOString()}`);
			
        });
	});
}

const runner = () => {
	
	// find all customers and Run Sitemap Update Service
	console.log('\n*** OSC Sitemap Update Service ***'  );
    let mongodbUri = '';
	
	if( process.env.npm_config_dev === 'true' ){
		mongodbUri = `mongodb://${keys.dev.host}:${keys.dev.port}/${keys.dev.dbname}`;
	}else{
		mongodbUri = `mongodb://${keys.db.username}:${keys.db.password}@${keys.db.host}:${keys.db.port}/${keys.db.dbname}`;
	}

	mongoose.connect(mongodbUri, {useNewUrlParser: true, useUnifiedTopology: true})
		.then(() => {
			console.log(`${mongodbUri} connected successfully.`);
		}).catch((err) => {
			console.log(" Mongoose connection error", err);
		});

	Customer.find()
		.then((customers) => {
			if(customers) { 
			
				console.log(`${customers.length} customers to be processed.`);
				
				run(customers)
			}

		

	  }).catch(err => console.log("Unable to reach database at the Moment"));

	//   exit after 5 mins
	  setTimeout(() => {
		  console.log(`Connection closed. Now exiting.`);
			mongoose.connection.close();
	  }, 30000);

};


runner();

