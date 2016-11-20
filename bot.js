/**
 * Created by patrickcremin on 11/18/16.
 */

"use strict"
var _ = require( 'lodash' );

var fetch = require( 'node-fetch' );

var orderBook = require( './orderBook' );

var candlestickManager = require( './candleStick' );

var trade = require( './trade' );


class Strategy {
    constructor()
    {
        this.movementSize = 0.5;        // how far has the price moved during this period

        this.purchaseSize = 0.01;       // how big of a buy to make.  This can be variable based on confidence later

        this.costDelta = 0.0;           // difference from closing value to make the purchase/sell

        this.smartOrders = [];
    }

    run()
    {
        orderBook.addOrderCompleteListener( this.onOrderComplete.bind( this ) );

        candlestickManager.onCandlestick( this.onTradingPeriodEnd.bind( this ) );
    }

    onTradingPeriodEnd( candleStick )
    {
        this.executeStrategy(candleStick);
    }

    executeStrategy( candleStick )
    {
        if ( candleStick.getBodySize() >= this.movementSize )
        {
            var price = 0;
            var movementSize = 0.3; // how far the market needs to move before selling/buying the most recent trade

            // hollow candlestick means the market is closing better than it opened
            if ( candleStick.isHollow() )
            {
                price = candleStick.close + this.costDelta;

                trade.sell( price, this.purchaseSize, (error, order) =>
                {
                    if(error == null)
                    {
                        this.createSmartOrder(order.price, order.size, order.side, movementSize)
                    }

                })
            }
            else
            {
                price = candleStick.close - this.costDelta;

                trade.buy( price, this.purchaseSize, (error, order) =>
                {
                    if(error == null)
                    {
                        this.createSmartOrder(order.price, order.size, order.side, movementSize)
                    }
                })
            }
        }
    }

    createSmartOrder(price, size, side, movementSize)
    {
        this.smartOrders.push(new SmartOrder(price, size, side, movementSize))
    }

    onOrderComplete( order )
    {
        var rollingCandleStick = candlestickManager.getRollingCandleStick();
        console.log( "rolling size: " + rollingCandleStick.size );
    }
}

var strategy = new Strategy();

strategy.run();


class SmartOrder {
    constructor( price, size, side, movementSize )
    {
        var type = side == "buy" ? "sell" : "buy";
        console.log("--- new 'smart order' created to " + type + " " + size + " at " + price)

        this.price = price;
        this.size = size;
        this.side = side;
        this.movementSize = movementSize;   // how big of a movement before selling/buying?

        this.isComplete = false;


        // TODO will need to remove listener also or this is going to run out of memory
        orderBook.addOrderCompleteListener( this.executeStrategy.bind( this ) );
    }

    executeStrategy( order )
    {
        if(this.isComplete) return;

        var lastPrice = parseFloat( order.price ); // TODO the order needs to be in the right form when it comes from the order book

        var isHollow = lastPrice > this.price;  // means that the price is going up
        var sizeDelta = Math.abs( lastPrice - this.price );


        if ( sizeDelta >= this.movementSize )
        {
            if ( isHollow )
            {
                if ( this.side == "buy" )
                {
                    // price is going up after I did a buy.  Sell!
                    console.log("--- smart order is doing a sell")
                    trade.sell(lastPrice, this.size);

                    // now, this doesnt mean that an actual sell occurred, but I tried.
                    this.isComplete = true;
                }

                if ( this.side == "sell" )
                {
                    // price is going up after I already sold.  I just lost out
                    // TODO only dealing with the buy side for now
                }
            }
            else
            {
                if ( this.side == "buy" )
                {
                    // price is going down after a purchase.  I just lost out

                }

                if ( this.side == "sell" )
                {
                    // price is going down even further after I did a sell.  Should I buy some now?
                    // TODO only dealing with the buy side for now

                    // price is going up after I did a buy.  Sell!
                    console.log("--- smart order is doing a buy")
                    trade.buy(lastPrice, this.size);

                    // now, this doesnt mean that an actual sell occurred, but I tried.
                    this.isComplete = true;
                }
            }
        }
    }
}
