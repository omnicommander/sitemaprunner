# Sitemap Runner

Updates sitemap arrays for customers within the customers table. 
Used in conjunction with auditrunner, to provide latest sitemap array.

## Configuration
edit `auditrunner/config/index.js`

```
    dev:{
		host: 'localhost',
		port: '27017',
		dbname: 'newaudit',
		siteLink: 'http://localhost:8080',
		email: 'developer@mail.com'
	}
```
Set the email address to receive notifications for development mode. 

## Install with latest version of everything everywhere
`npm install npm@latest -g`

## run developer mode using local mongoDB
`npm run audit --dev` 

## run production mode using production mongoDB
`npm run audit`

