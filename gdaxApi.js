"use strict"

var WebSocket = require( 'ws' );
var fetch = require( 'node-fetch' );
var crypto = require( 'crypto' );
require('dotenv').config();

// var passphrase = "z5p4prjkdnzn792iv37ue4s4i";
// var apikey = "c619b76d97e22a60e7dacc6826d9391a";
// var secret = "YW2DSp9hAbIyHlS29q1c5y3uqaeZXMp7zIqYiKQ1rnjHvFCuDgxfasOpt7m/GvTDnXvrwJpv8FfePfCDQKaQWg==";


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
                this.listeners.forEach( ( listener ) => listener( JSON.parse( data ) ) )
            } );
        } );
    }

    addListener( listener )
    {
        this.listeners.push( listener )
    }

    removeListener( listener )
    {
        for ( var i = 0; i < this.listeners.length; i++ )
        {
            if ( this.listeners[ i ] == listener )
            {
                delete this.listeners[ i ];
                break;
            }
        }
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

        fetch( url, {
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

        this.privateFetch( requestPath, method, null, cb );
    }

    orderBook( level, cb )
    {
        var requestPath = "/products/BTC-USD/book?level=" + level;

        var method = "GET";

        this.privateFetch( requestPath, method, null, cb );
    }

    listAccounts( cb )
    {
        var requestPath = "/accounts"

        var method = "GET";

        this.privateFetch( requestPath, method, null, cb );
    }

    getAccount( accountType, cb )
    {
        var requestPath = "/accounts/" + accountType;

        var method = "GET";

        return this.privateFetch( requestPath, method, null, cb );
    }

    buy( price, size, cb )
    {
        var requestPath = "/orders";

        var method = "POST";

        var body = {
            "size": size.toString(),
            "price": price.toString(),
            "side": "buy",
            "product_id": "BTC-USD"
        };

        return this.privateFetch( requestPath, method, body, (order) => {
            order.price = parseFloat(order.price);
            order.size = parseFloat(order.size);
            order.filled_size = parseFloat(order.filled_size);
            order.executed_value = parseFloat(order.executed_value);

            cb(order)
        } );
    }

    sell( price, size, cb )
    {
        var requestPath = "/orders";

        var method = "POST";

        var body = {
            "size": size.toString(),
            "price": price.toString(),
            "side": "sell",
            "product_id": "BTC-USD"
        };

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

        this.privateFetch( requestPath, method, null, cb );
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

        fetch( url, config )
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

