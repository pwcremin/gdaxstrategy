/**
 * Created by patrickcremin on 11/20/16.
 */
"use strict";

var orderBook = require( './orderBook' );
var gdaxApi = require( './gdaxApi' );

var balance = require('/balance');

var emitter = require( './emitter' ).emitter;
var events = require( './emitter' ).events;

class Trade {

    constructor()
    {
        this.openOrders = {};

        this.letOrderLiveDuration = 1000 * 30;

        this.trackedOrders = {};

        emitter.on(events.ORDER_COMPLETE, this.onOrderComplete.bind( this ))
    }

    buy( price, size, onOrderCompleteCallback )
    {
        gdaxApi.buy( price, size, this.trackOrder.bind( this, onOrderCompleteCallback ) );
    }

    sell( price, size, onOrderCompleteCallback )
    {
        gdaxApi.sell( price, size, this.trackOrder.bind( this, onOrderCompleteCallback ) );
    }

    trackOrder( onOrderCompleteCallback, order )
    {
        //TODO better error check
        if ( !order.id )
        {
            console.log( "Trade: ERROR, order failed: " + JSON.stringify( order ) );
            return;
        }

        this.trackedOrders[ order.id ] = onOrderCompleteCallback;

        console.log( '*** Trade: Order placed of type: ' + order.side + " for " + order.size + " coins at $" + order.price );


        this.openOrders[ order.id ] = {
            price: order.price,
            size: order.size,
            side: order.side,
            id: order.id
        };

        //setTimeout( this.cancelOrder.bind( this, order.id ), this.letOrderLiveDuration );
    }

    onOrderComplete( order )
    {
        var didUpdate = this.updateActiveOrder(order);

        if(didUpdate == false)
        {
            // TODO this logic should be in the strategy, not the trade
            // if this wasnt my order then I want to cancel because the market is moving
            // and my a buy/sell didnt happen

            // not sure about this.. the next order could be matching mine?
            // put in a delay
            setTimeout(this.cancelOpenOrders.bind(this), 5000);
            //this.cancelOpenOrders()
        }
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
        var activeOrder = this.openOrders[ order[ "order_id" ] ];

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
