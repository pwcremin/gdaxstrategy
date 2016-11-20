"use strict"

var _ = require( 'lodash' );
var gdaxApi = require( './gdaxApi' );

var candleStickManager = require( './candleStick' );

class OrderBook {
    constructor()
    {

        this.book = {
            sequence: "",
            bids: {}
            //[ price, size, order_id ],
            ,
            asks: {},
            //[ price, size, order_id ],
            filled: []
        };

        this.orderCompleteListeners = [];

        this.force = new Force();

        this.queue = [];

        this.orderListener = order => this.queue.push( order );
        gdaxApi.addListener( this.orderListener );

        this.createOrderBook()

        this.getTop();

        //setInterval(this.getTop.bind(this),  1000 * 1);
    }

    getTop()
    {
        var highestBid = 0;
        Object.keys(this.book.bids).forEach( (key) => {
            highestBid = this.book.bids[key].price > highestBid ? this.book.bids[key].price : highestBid;
        });

        var lowestAsk = null;
        Object.keys(this.book.asks).forEach( (key) => {
            if(!lowestAsk) lowestAsk = this.book.asks[key].price;

            lowestAsk = this.book.asks[key].price < lowestAsk ? this.book.asks[key].price : lowestAsk;
        });

        var top = {
            bid: highestBid,
            ask: lowestAsk,
            spread: lowestAsk - highestBid
        };

        //console.log(JSON.stringify(top));

        return top;
    }

    addOrderCompleteListener( cb )
    {
        this.orderCompleteListeners.push(cb);
    }

    getOrder( orderId )
    {
        if ( this.book.bids[ orderId ] )
        {
            return this.book.bids[ orderId ]
        }
        else if ( this.book.asks[ orderId ] )
        {
            return this.book.asks[ orderId ]
        }

        console.log( "------ FUCK ORDER DOESNT EXIST - why is this happening?" )
    }

    createOrderBook()
    {
        gdaxApi.orderBook( "3", orderbook =>
        {
            orderbook.bids.forEach( bid =>
            {
                this.book.bids[ bid[ 2 ] ] = {
                    sequence: orderbook[ "sequence" ],
                    price: parseFloat( bid[ 0 ] ),
                    size: parseFloat( bid[ 1 ] )
                }
            } );

            orderbook.asks.forEach( bid =>
            {
                this.book.asks[ bid[ 2 ] ] = {
                    sequence: orderbook[ "sequence" ],
                    price: parseFloat( bid[ 0 ] ),
                    size: parseFloat( bid[ 1 ] )
                }
            } );

            orderbook.sequence = orderbook[ "sequence" ];


            gdaxApi.addListener( this.onMessage.bind( this ) );
            gdaxApi.removeListener( this.orderListener );

            var sequenceNumber = this.book.sequence;
            this.queue.forEach( order =>
            {
                if ( order[ "sequence" ] > sequenceNumber )
                {
                    this.onMessage( order )
                }
            } )
        } )
    }


    onMessage( order )
    {
        this.book.sequence = order[ "sequence" ];

        switch ( order.type )
        {
            case "open":

                this.addEntry( order );

                break;

            case "done":

                this.updateCandleSticks( order );
                this.deleteEntry( order );

                break;

            case "change":

                this.updateEntry( order )

                break;

            case "match":

                this.addEntry( order );

                break;

            default:
                break;
        }
    }

    addEntry( order )
    {
        var orderId = order[ "type" ] === "match" ? order[ "taker_order_id" ] : order[ "order_id" ];

        var bookType = order.side == "buy" ? "bids" : 'asks';

        var size = order[ "type" ] == "open" ? order[ "remaining_size" ] : order[ "size" ];

        this.book[ bookType ][ orderId ] = {
            price: parseFloat( order[ "price" ] ),
            size: parseFloat( size ),
            orderId: orderId,
            side: order[ "side" ]
        };
    }

    deleteEntry( order )
    {
        delete this.book.bids[ order[ "order_id" ] ];
        delete this.book.asks[ order[ "order_id" ] ];
    }

    updateEntry( order )
    {
        var orderId = order[ "order_id" ];
        var bookType = order.side == "buy" ? "bids" : 'asks';

        this.book[ bookType ][ orderId ].size = parseFloat( order[ "new_size" ] );
    }

    updateCandleSticks( order )
    {
        if ( order[ "reason" ] == "filled" )
        {
            this.force.move();

            var orderId = order[ "order_id" ];

            // TODO need to do something with the remaining size.  Means there is some of the order left
            // and could affect volume tracking
            if ( this.getOrder( orderId ) == null )
            {
                // TODO wtf... why does this happen
                // if I keep with my current strategy I think I would be better off just getting the orders fom the
                //  rest api and building the candles with it
                console.log( "MISSING ORDER" )


            }
            else
            {
                // TODO I think I am adding orders 2x.  should only add buy or sell side?
                candleStickManager.add( this.getOrder( orderId ) );

                // TODO need some listener or even class at some point
                this.orderCompleteListeners.forEach( cb => cb(order) );
            }


        }
    }

}

class Force {
    constructor()
    {
        this.numTrades = 0;

        this.velocity = 0;// num trades per period

        this.startTime = Date.now();

        this.intervalInSeconds = 1;

        this.timerId = setInterval(this.calculate.bind(this), 1000 * this.intervalInSeconds)
    }

    calculate()
    {
        //var time = (Date.now() - this.startTime) * 0.0001;  // in seconds
        this.velocity = this.numTrades / this.intervalInSeconds;

        this.numTrades = 0;
        this.startTime = Date.now();

        //console.log('velocity: ' + this.velocity);
    }
    move()
    {
        this.numTrades++;
    }

    getVelocity()
    {

    }
}
module.exports = new OrderBook();
