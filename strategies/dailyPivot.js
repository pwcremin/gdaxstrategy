// This strategy involves profiting from a stock's daily volatility.
// This is done by attempting to buy at the low of the day and sell
// at the high of the day. Here the price target is simply at the next
// sign of a reversal



"use strict";

var _ = require( 'lodash' );

var fetch = require( 'node-fetch' );

var orderBook = require( './../orderBook' );

var candlestickManager = require( './../candleStick' );

var dataLogger = require('../datalogger');

var emitter = require( '../emitter' ).emitter;
var events = require( '../emitter' ).events;

// THOUGHTS
// * Make the same strategy but at different granularities.  One even a day long could be good
// * Need to analyze what the candlesticks are doing.  If in a hard core upward trend then wouldnt want to do buy
//      but would want to sell when it topped off

class Strategy {
    constructor()
    {
        this.movementSize = 0.5;        // how far has the price moved during this period

        // TODO need to do some testing. It may be that different order sizes are more likely to go through
        this.purchaseSize = 0.03;       // how big of a buy to make.  This can be variable based on confidence later

        this.costDelta = 0.0;           // difference from closing value to make the purchase/sell

        this.canExecute = true;         // only want to run once per trading cycle

        this.smartOrders = [];
    }

    run()
    {
        emitter.on(events.ORDER_COMPLETE, () => this.executeStrategy( candlestickManager.getRollingCandleStick() ));
        emitter.on(events.ORDER_COMPLETE, this.onOrderComplete.bind( this ) );

        emitter.on(events.CANDLESTICK_COMPLETE, this.onTradingPeriodEnd.bind( this ) );
    }

    onTradingPeriodEnd( candleStick )
    {
        this.canExecute = true;

        this.executeStrategy( candleStick );
    }

    executeStrategy( candleStick )
    {
        return;

        if ( !this.canExecute ) return;

        if ( candleStick.getBodySize() >= this.movementSize )
        {
            this.canExecute = false;

            var price = 0;
            var movementSize = 0.3; // how far the market needs to move before selling/buying the most recent trade

            // hollow candlestick means the market is closing better than it opened
            if ( candleStick.isHollow() )
            {
                price = candleStick.close + this.costDelta;

                trade.sell( price, this.purchaseSize, ( cancelled, order ) =>
                {
                    if ( !cancelled )
                    {
                        this.createSmartOrder( order.price, order.size, order.side, movementSize )
                    }
                    else
                    {
                        this.canExecute = true;
                    }
                } )
            }
            else
            {
                price = candleStick.close - this.costDelta;

                trade.buy( price, this.purchaseSize, ( cancelled, order ) =>
                {
                    if ( !cancelled )
                    {
                        this.createSmartOrder( order.price, order.size, order.side, movementSize )
                    }
                    else
                    {
                        console.log('^^^ order cancelled so enabling purchase again')
                        this.canExecute = true;
                    }
                } )
            }
        }
    }

    createSmartOrder( price, size, side, movementSize )
    {
        this.smartOrders.push( new SmartOrder( price, size, side, movementSize ) )
    }

    onOrderComplete( order )
    {
    }
}

var strategy = new Strategy();

strategy.run();


class SmartOrder {
    constructor( price, size, side, movementSize )
    {
        var type = side == "buy" ? "sell" : "buy";
        console.log( "--- new 'smart order' created to " + type + " " + size + " at " + price )

        this.price = price;
        this.size = size;
        this.side = side;
        this.movementSize = movementSize;   // how big of a movement before selling/buying?

        this.isComplete = false;

        this.executeStrategyCallback = this.executeStrategy.bind( this )

        emitter.on(events.ORDER_COMPLETE, this.executeStrategyCallback);
    }

    executeStrategy( order )
    {
        if ( this.isComplete ) return;

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
                    console.log( "--- smart order is doing a sell" )
                    trade.sell( lastPrice, this.size );

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
                    console.log( "--- smart order is doing a buy" )
                    trade.buy( lastPrice, this.size );

                    // now, this doesnt mean that an actual sell occurred, but I tried.
                    this.isComplete = true;
                }
            }
        }

        if(this.isComplete)
        {
            emitter.removeListener(events.ORDER_COMPLETE, this.executeStrategyCallback);
        }
    }
}
