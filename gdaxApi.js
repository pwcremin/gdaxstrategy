"use strict"

var WebSocket = require( 'ws' );
var fetch = require( 'node-fetch' );
var crypto = require( 'crypto' );
require('dotenv').config();

var emitter = require( './emitter' ).emitter;
var events = require( './emitter' ).events;

class GdaxApi {

    constructor()
    {
        this.listeners = [];

        this.gdaxEndpoint = "https://api.gdax.com";
        this.ws = new WebSocket( 'wss://ws-feed.gdax.com' );

        this.ws.on( 'open', () =>
        {
            this.subscribe();

            this.ws.on( 'message', ( data ) =>
            {
                emitter.emit(events.WSS_MESSAGE, JSON.parse( data ))
            } );
        } );
    }

    subscribe()
    {
        var subscribe = {
            "type": "subscribe",
            "product_ids": [
                "BTC-USD"
            ]
        };

        this.ws.send( JSON.stringify( subscribe ) );
    }


    getProducts( cb )
    {
        var requestPath = "/products";

        return this.fetchJson( requestPath, cb )
    }

    getTrades( cb )
    {
        var requestPath = "/products/BTC-USD/trades";

        return this.fetchJson( requestPath, cb );
    }

    getCandles( cb )
    {
        var requestPath = "/products/BTC-USD/candles";

        return this.fetchJson( requestPath, cb );
    }


    fetchJson( requestPath, cb )
    {
        var url = this.gdaxEndpoint + requestPath;

        cb = cb || () =>
            {
            };

        return fetch( url, {
            method: 'GET',
            headers: {
                "Content-Type": "application/json"
            }
        } )
            .then( res => res.json() )
            .then( json =>
            {
                cb( json );

                return json
            } );
    }

    ///////////////////////////////////
    //      PRIVATE
    ///////////////////////////////////

    getTrades( cb )
    {
        var requestPath = "/products/BTC-USD/trades";

        var method = "GET";

        return this.privateFetch( requestPath, method, null, cb );
    }

    orderBook( level, cb )
    {
        var requestPath = "/products/BTC-USD/book?level=" + level;

        var method = "GET";

        return this.privateFetch( requestPath, method, null, cb );
    }

    listAccounts( cb )
    {
        var requestPath = "/accounts"

        var method = "GET";

        return this.privateFetch( requestPath, method, null, cb );
    }

    getAccount( accountType, cb )
    {
        var requestPath = "/accounts/" + accountType;

        var method = "GET";

        return this.privateFetch( requestPath, method, null, cb );
    }

    buy( type, price, size, cb )
    {
        var requestPath = "/orders";

        var method = "POST";

        var body = {
            "type": type,
            "size": size.toString(),
            "side": "buy",
            "product_id": "BTC-USD"
        };

        if(type !== 'market')
        {
            body['price'] = price.toString();
        }

        return this.privateFetch( requestPath, method, body, (order) => {
            order.price = parseFloat(order.price);
            order.size = parseFloat(order.size);
            order.filled_size = parseFloat(order.filled_size);
            order.executed_value = parseFloat(order.executed_value);

            cb(order)
        } );
    }

    sell( type, price, size, cb )
    {
        var requestPath = "/orders";

        var method = "POST";

        var body = {
            "type": type,
            "size": size.toString(),
            "side": "sell",
            "product_id": "BTC-USD"
        };

        if(type !== 'market')
        {
            body['price'] = price.toString();
        }

        return this.privateFetch( requestPath, method, body, (order) => {
            order.price = parseFloat(order.price);
            order.size = parseFloat(order.size);
            order.filled_size = parseFloat(order.filled_size);
            order.executed_value = parseFloat(order.executed_value);

            cb(order)
        } );
    }

    cancel(order_id, cb)
    {
        var requestPath = "/orders/" + order_id;
        var method = "DELETE";

        return this.privateFetch( requestPath, method, null, cb );
    }

    privateFetch( requestPath, method, body, cb )
    {
        var url = this.gdaxEndpoint + requestPath;
        var timestamp = Date.now() / 1000;
        var cbAccessSign = this.createCBACCESSSIGN( requestPath, timestamp, body, method );

        var config = {
            method: method,
            headers: {
                "Content-Type": "application/json",
                "CB-ACCESS-KEY": process.env.apikey,            // The api key as a string.
                "CB-ACCESS-SIGN": cbAccessSign,     // The base64-encoded signature (see Signing a Message).
                "CB-ACCESS-TIMESTAMP": timestamp,   //A timestamp for your request.
                "CB-ACCESS-PASSPHRASE": process.env.passphrase, //The passphrase you specified when creating the API key.
            }
        };

        if ( body )
        {
            config.body = JSON.stringify(body);
        }

        return fetch( url, config )
            .then( res => res.json() )
            .then( json =>
            {
                cb( json );

                return json
            } );
    }

    createCBACCESSSIGN( requestPath, timestamp, body, method )
    {
        // create the prehash string by concatenating required parts
        var what = timestamp + method + requestPath// + body;

        if ( body )
        {
            what += JSON.stringify(body);
        }

        // decode the base64 secret
        var key = Buffer( process.env.secret, 'base64' );

        // create a sha256 hmac with the secret
        var hmac = crypto.createHmac( 'sha256', key );

        // sign the require message with the hmac
        // and finally base64 encode the result
        return hmac.update( what ).digest( 'base64' );
    }
}


module.exports = new GdaxApi();

