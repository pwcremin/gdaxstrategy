/**
 * Created by patrickcremin on 11/20/16.
 */
"use strict";

var orderBook = require( './orderBook' );
var gdaxApi = require( './gdaxApi' );

var balance = require('./balance');

var emitter = require( './emitter' ).emitter;
var events = require( './emitter' ).events;

class Trade {

    constructor()
    {
        this.openOrders = {};

        this.trackedOrders = {};

        emitter.on(events.ORDER_COMPLETE, this.onOrderComplete.bind( this ))
    }

    // NOTE ON BUY SELL
    // Users listening to streaming market data are encouraged to use the
    // client_oid field to identify their received messages in the feed.
    // The REST response with a server order_id may come after the received
    // message in the public data feed.

    // Decimal numbers are returned as strings to preserve full precision across platforms.
    // When making a request, it is recommended that you also convert your numbers to strings
    // to avoid truncation and precision errors.
    // Integer numbers (like trade id and sequence) are unquoted.

    // type: limit, market, or stop (default is limit)
    buy( type, price, size, onOrderCompleteCallback )
    {
        gdaxApi.buy( type, price, size, this.trackOrder.bind( this, onOrderCompleteCallback ) );
    }

    sell( type, price, size, onOrderCompleteCallback )
    {
        gdaxApi.sell( type, price, size, this.trackOrder.bind( this, onOrderCompleteCallback ) );
    }

    trackOrder( onOrderCompleteCallback, order )
    {
        //TODO better error check
        if ( !order.id )
        {
            console.log( "Trade: ERROR, order failed: " + JSON.stringify( order ) );
            return null;
        }

        this.trackedOrders[ order.id ] = onOrderCompleteCallback;

        console.log( '*** Trade: Order placed of type: ' + order.side + " for " + order.size + " coins at $" + order.price );


        this.openOrders[ order.id ] = {
            price: order.price,
            size: order.size,
            side: order.side,
            id: order.id
        };
    }

    onOrderComplete( order )
    {
        this.updateActiveOrder(order);
    }

    cancelOpenOrders()
    {
        for(var id in this.openOrders)
        {
            console.log('^^^ Trade: canceling open orders')
            this.cancelOrder(id)
        }
    }

    updateActiveOrder(order)
    {
        if(order == null)
        {
            console.log('d')
        }
        var activeOrder = this.openOrders[ order.id ];

        if ( activeOrder )
        {
            console.log( "*** Trade: " + activeOrder.side + " order complete for " + activeOrder.size + " coins at $" + activeOrder.price );

            if(this.trackedOrders[ order.id ])
            {
                this.trackedOrders[ order.id ]( null, activeOrder );
                delete this.trackedOrders[ order.id ];
            }

            if ( activeOrder.side === "sell" )
            {
                balance.sell( activeOrder.price, activeOrder.size );
            }
            else if ( order.side === "buy" )
            {
                balance.purchase( activeOrder.price, activeOrder.size );
            }

            delete this.openOrders[ activeOrder.id ];

            balance.log();

        }

        return activeOrder != null;
    }

    cancelOrder( id )
    {
        var order = this.openOrders[ id ];

        if ( order )
        {
            console.log( "*** Trade: canceling " + order.side + " order for " + order.size + " at " + order.price );

            gdaxApi.cancel( id, ( id ) => console.log( "order canceled: " + JSON.stringify( id ) ) )

            this.trackedOrders[ id ]( "cancelled" );
            delete this.trackedOrders[ id ];

            delete this.openOrders[ id ];
        }
    }
}



var trade = new Trade();

// TESTING
// trade.buy(100, 0.1, function(error, order){
//     if(error)
//     {
//         console.log('trade cancelled or error: ' + error )
//     }
//     else {
//         console.log('trade complete: ' + JSON.stringify(order))
//     }
//
// } );

//gdaxApi.listAccounts((account => console.log(JSON.stringify(account))))

//gdaxApi.getTrades((trades => console.log(JSON.stringify(trades))))

module.exports = trade;
