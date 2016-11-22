// When there is an increase in number of buys/sells track them until they slow down, and then do the opposite (make a buy or sell)
// The idea is that other bots/people know what they are doing (or are even manipulating the market)
// So if they suddenly drive down the price through lots of activity, thats a good time to buy, and if they drive it up then sell.
//
// This isnt that different from dailyPivot, but it isnt looking at candlesticks.  Its tracking the momentum
// of trades and assuming the people doing those trades are analyzing the market for me.
//
// TODO currently only looking at the number of trades being made.  Would the size (number of coins) being traded be helpful to track?
//
// TODO strategy idea: when the market is flat (price is staying about the same) that would be a good time to buy/sell at the top and bottom of candlesticks
//

"use strict";

var emitter = require( '../emitter' ).emitter;
var events = require( '../emitter' ).events;

var _ = require( 'lodash' );
var balance = require('../balance');
var trade = require('../trade');


class MomentumStrategy {
    constructor()
    {
        var timeIntervalInMS = 1 * 60 * 1000; //minutes
        var blockSizeInMS = 5 * 1000; //seconds

        this.waitTimeBetweenTradeMS = 1 * 60 * 1000;
        this.canTrade = true;

        this.blockMovingAverages = {
            buy: new BlockMovingAverage( timeIntervalInMS, blockSizeInMS ),
            sell: new BlockMovingAverage( timeIntervalInMS, blockSizeInMS )
        };

        this.onOrderCompleteCallback = this.onOrderComplete.bind( this );
    }

    run()
    {
        emitter.on( events.ORDER_COMPLETE, this.onOrderCompleteCallback );

        this.blockMovingAverages.buy.start();
        this.blockMovingAverages.sell.start();
    }

    stop()
    {
        // TODO dont cancel here, should be some master strategy runner that cancels all the order
        //trade.cancelOpenOrders();

        emitter.removeListener( events.ORDER_COMPLETE, this.onOrderCompleteCallback );

        this.blockMovingAverages.buy.stop();
        this.blockMovingAverages.sell.stop();
    }

    executeStrategy(order)
    {
        if(this.canTrade == false) return;

        // look at the data and buy, sell, or do nothing

        var buyMA = this.blockMovingAverages.buy.getAverage();
        var sellMA = this.blockMovingAverages.sell.getAverage();

        var buyWeightedMA = this.blockMovingAverages.buy.getWightedAverage();
        var sellWeightedMA = this.blockMovingAverages.sell.getWightedAverage();

        var executeWeight = 0.4;
        var tradeSize = 0.03;

        // TODO this isnt waiting until they slow down. Its just buying when everyone else goes nuts.  maybe ok
        if(buyWeightedMA >= executeWeight)
        {
            this.makeBuy(order.price, tradeSize)
        }

        if(sellWeightedMA >= executeWeight)
        {
            this.makeSell(order.price, tradeSize)
        }
    }

    makeBuy(price, size)
    {
        console.log('***** Strategy: buy');

        trade.buy('market', price, size, (cancelled, order) => {
            balance.purchase(order.price, order.size);
            balance.log();
        });

        this.pauseTrading();
    }

    makeSell(price, size)
    {
        console.log('***** Strategy: sell');

        trade.sell('market', price, size, (cancelled, order) => {
            balance.purchase(order.price, order.size);
            balance.log();
        });

        this.pauseTrading();
    }

    pauseTrading()
    {
        this.canTrade = false;
        setTimeout(() => this.canTrade = true, this.waitTimeBetweenTradeMS)
    }

    onOrderComplete( order )
    {
        // tracking how many orders over a time period using blocks
        this.blockMovingAverages[order.side].push(1)

        // todo track the size as a movingaverage too, could be useful

        //this.executeStrategy( order );

        this.log()
    }

    log()
    {
        var buyMA = this.blockMovingAverages.buy.getAverage();
        var sellMA = this.blockMovingAverages.sell.getAverage();

        var buyWeightedMA = this.blockMovingAverages.buy.getWightedAverage();
        var sellWeightedMA = this.blockMovingAverages.sell.getWightedAverage();

        console.log( "--- buy MA: " + buyMA + " WMA:" + buyWeightedMA );
        console.log( "--- sell MA: " + sellMA + " WMA:" + sellWeightedMA );
    }
}

//  For tracking number of orders over a time period
class BlockMovingAverage {
    constructor(sizeInMS, blockSizeInMS)
    {
        this.movineAverage = new MovingAverage(sizeInMS);

        this.blockSizeInMS = blockSizeInMS;

        this.block = 0;
    }

    push(value)
    {
        this.block += value;
    }

    start()
    {
        this.bockTimerId = setInterval( this.updateBlock.bind( this ), this.blockSizeInMS );
        this.movineAverage.start();
    }

    stop()
    {
        clearInterval( this.bockTimerId );
        this.movineAverage.stop();
    }
    getAverage()
    {
        return this.movineAverage.getAverage()
    }

    getWightedAverage()
    {
        return this.movineAverage.getWightedAverage()
    }

    updateBlock()
    {
        this.movineAverage.push(this.block);
        this.block = 0;
    }
}

class MovingAverage {
    constructor( sizeInMS )
    {
        this.sizeInMS = sizeInMS;
        this.window = [];
    }

    start()
    {
        this.timerId = setInterval( this.update.bind( this ), 500 );
    }

    stop()
    {
        clearInterval( this.timerId );
    }

    push( value )
    {
        this.window.push( { time: Date.now(), value: value } )
    }

    getAverage()
    {
        if ( this.window.length == 0 ) return 0;

        var avg = _.sumBy( this.window, 'value' ) / this.window.length;

        return Number( Math.round( avg + 'e2' ) + 'e-2' ).toFixed( 2 );
    }

    getWightedAverage()
    {
        if(this.window.length == 0) return 0;

        var lengthArray = _.range(1, this.window.length);
        var triangularD = lengthArray.reduce((v, c, i) =>
        {
            return v + i
        }, 1);

        var avg = this.window.reduce( ( avg, data, index ) =>
        {
            var i = index + 1;
            return avg + (data.value * (i / triangularD));
        }, 0 )

        return Number( Math.round( avg + 'e2' ) + 'e-2' ).toFixed( 2 );
    }

    update()
    {
        var startTime = Date.now() - this.sizeInMS;

        for ( var i = 0; i < this.window.length; i++ )
        {
            if ( this.window[ i ].time < startTime )
            {
                this.window.slice( i, 1 );
            }
        }
    }
}



module.exports = new MomentumStrategy();