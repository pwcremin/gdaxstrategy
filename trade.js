/**
 * Created by patrickcremin on 11/20/16.
 */
"use strict";

var orderBook = require( './orderBook' );
var gdaxApi = require( './gdaxApi' );
var candlestickManager = require( './candleStick' );


class Trade {

    constructor()
    {
        this.openOrders = {};

        this.letOrderLiveDuration = 1000 * 30;

        this.balance = new Balance();

        this.trackedOrders = {};

        orderBook.addOrderCompleteListener( this.onOrderComplete.bind( this ) );
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
            console.log( "ERROR, order failed: " + JSON.stringify(order));
            return;
        }

        this.trackedOrders[order.id] = onOrderCompleteCallback;

        console.log( '*** Order placed of type: ' + order.side + " for " + order.size + " coins at $" + order.price );


        this.openOrders[ order.id ] = {
            price: order.price,
            size: order.size,
            side: order.side,
            id: order.id };

        setTimeout( this.cancelOrder.bind( this, order.id ), this.letOrderLiveDuration );
    }

    onOrderComplete( order )
    {
        var activeOrder = this.openOrders[ order["order_id"] ];

        if ( activeOrder )
        {
            console.log( "*** " + activeOrder.side + " order complete for " + activeOrder.size + " coins at $" + activeOrder.price);

            this.trackedOrders[order.id](null, activeOrder);
            delete this.trackedOrders[order.id];

            if ( activeOrder.side === "sell" )
            {
                this.balance.sell( activeOrder.price, activeOrder.size );
            }
            else if ( order.side === "buy" )
            {
                this.balance.purchase( activeOrder.price, activeOrder.size );
            }

            delete this.openOrders[ activeOrder.id ];

            this.balance.log();
        }
    }

    cancelOrder( id )
    {
        var order = this.openOrders[id];

        if(order)
        {
            console.log( "*** canceling " + order.side + " order for " + order.size + " at " + order.price);

            gdaxApi.cancel( id, ( id ) => console.log( "order canceled: " + id ) )

            this.trackedOrders[id]("cancelled");
            delete this.trackedOrders[id];

            delete this.openOrders[ id ];
        }
    }
}

class Balance {
    constructor()  // USD, BTC
    {
        // TODO get the btcValue from the gdaxapi

        gdaxApi.listAccounts((accounts => {
            accounts.forEach(account => {
                if(account.currency == "BTC")
                    this.coins = account.balance;

                if(account.currency == "USD")
                    this.cash = account.balance;
            });
        }));

        gdaxApi.getTrades((trades => {
            this.btcValue = trades[0].price
        }));


        this.initialValue = this.getBalance();
    }

    purchase( price, size )
    {
        this.cash -= price * size;
        this.coins += size;

        this.btcValue = price;
    }

    sell( price, size )
    {
        this.cash += price * size;
        this.coins -= size;

        this.btcValue = price;
    }

    getBalance()
    {
        return this.cash + (this.coins * this.btcValue);
    }

    log()
    {
        console.log( '---------------------' )
        console.log( "USD: " + this.cash );
        console.log( "BTC: " + this.coins );
        console.log( "GAIN: $" + this.getBalance() - this.initialValue )
        console.log( '---------------------' )
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
