// Tracks all orders


"use strict";
var orderBook = require( './orderBook' );

var emitter = require( './emitter' ).emitter;
var events = require( './emitter' ).events;

class OrderTracker {
    constructor()
    {
        this.sequence = 0;

        this.orders = {};

        this.deletedOrders = {};

        this.matchedMakerOrders = {};
        this.matchedTakerOrders = {};

        this.onMessageCallback = this.onMessage.bind( this );

        emitter.on( events.WSS_MESSAGE, this.onMessageCallback );
    }

    onMessage( order )
    {
        // ORDER LIFECYLE
        // received -> match -> done

        //          -> open -> done
        //          -> done (cancelled do to self trade?)
        //          -> change   -> match -> done
        //                      -> open -> done

        switch ( order.type )
        {
            case "received":
                // The received message does not indicate a resting order on the order book.
                // It simply indicates a new incoming order which has been accepted by the matching
                // engine for processing. Received orders may cause match message to follow
                // if they are able to begin being filled (taker behavior). Self-trade prevention
                // may also trigger change messages to follow if the order size needs to be adjusted.
                // Orders which are not fully filled or canceled due to self-trade prevention result
                // in an open message and become resting orders on the order book.

                this.sequence = order["sequence"];

                this.addOrder( order );
                break;

            case "match":
                // A trade occurred between two orders. The aggressor or taker order
                // is the one executing immediately after being received and the maker
                // order is a resting order on the book. The side field indicates the
                // maker order side. If the side is sell this indicates the maker was a
                // sell order and the match is considered an up-tick. A buy side match is a down-tick.

                //this.handleMatch( order );
                break;

            case "open":
                // The order is now open on the order book. This message will only be sent for orders
                // which are not fully filled immediately. remaining_size will indicate how much of
                // the order is unfilled and going on the book.

                // may only matter for the order book and not the track
                // since this tool will already be tracking the order

                // TODO for tracking orders 'open' may not matter at all
                //this.addEntry( order );
                break;

            case "done":
                // The order is no longer on the order book. Sent for all orders for
                // which there was a received message. This message can result from an
                // order being canceled or filled. There will be no more messages for this
                // order_id after a done message. remaining_size indicates how much of the
                // order went unfilled; this will be 0 for filled orders.

                // A done message will be sent for received orders which are fully filled or
                // canceled due to self-trade prevention. There will be no open message for such orders.
                this.orderDone( order );

                break;

            case "change":

                this.updateEntry( order )

                break;

            default:
                break;
        }
    }

    // addReceivedOrder(order)
    // {
    //     this.receivedOrders[order[ "order_id" ]] = order;
    // }
    //
    handleMatch( order )
    {
        // GOT IT - both orders will be tracked since they come in through received.
        // so try not doing anything with 'match' and see if there is ever a missing order

        this.matchedMakerOrders[order["maker_order_id"]] = order;
        this.matchedTakerOrders[order["taker_order_id"]] = order;

        var time = Date.now();

        // TODO sometimes both orders exist.  need to just take the maker since that is the id that is always
        // on the done order

        // TODO still don't know why sometimes only the taker is in orders but its still found on the maker id?
        // that cant be possible... unless the maker never came in on the 'received' because it was already on the books?
        // Dont see how this can be


        // Think I have it.  If the order is not completely filled, then it stays on the books with a remainder
        // so the 'done' order has the id of whoever was 100% filled.

        // This also means that just tracking number of orders doesnt tell me much.  If a person puts in an order for 100 coins
        // then that could result in 100 orders being filled to meet the purchase.  It doesnt tell me that 100 people decided
        // to start selling.


        // I don't know why, but it is always the maker id that ends up in the final done order id
        if(this.orders[order["maker_order_id"]])
        {
            console.log(time + ": maker order exist " + order["maker_order_id"])
        }

        // when there is a match, it is always the maker order id that end up in the done order id.  no idea why
        if(this.orders[order["taker_order_id"]])
        {
            console.log(time + ": taker order exist " + order["taker_order_id"])
        }
    }

    addOrder( order )
    {
       // console.log(order["order_id"]);

        var newOrder = this.createOrder( order );

        if(!newOrder)
        {
            console.log('d')
        }

        this.orders[ newOrder.id ] = newOrder;

        return this.orders[ newOrder.id ];
    }

    updateEntry( order )
    {
        this.orders[ order[ "order_id" ] ].size = parseFloat( order[ "new_size" ] );
    }

    getOrder( id )
    {
        return this.orders[ id ];
    }

    createOrder( order )
    {
        let trackedOrder = null;

        if(order["order_type"] === "market")
        {
            trackedOrder = this.createMarketOrder(order)
        }
        else
        {
            trackedOrder = {
                price: parseFloat( order[ "price" ] ),
                size: parseFloat( order[ "size" ] ),
                id: order[ "order_id" ],
                side: order[ "side" ],
                type: order[ "order_type" ],
            };
        }

        return trackedOrder;
    }

    createMarketOrder( order )
    {
        let marketOrder = {
            id: order["order_id"],
            side: order[ "side" ],
            type: order[ "order_type" ],
        };

        if(order["funds"])
        {
            marketOrder.funds = parseFloat( order["funds"] );
        }

        if(order["size"])
        {
            marketOrder.size = parseFloat( order["size"] );
        }

        if(order["price"])
        {
            marketOrder.size = parseFloat( order["price"] );
        }

        return marketOrder;
    }
    orderDone( order )
    {
        this.updateOrders( order );
    }

    updateOrders( order)
    {
        if ( order[ "reason" ] == "filled" )
        {
            // test to see if we have both ids in received
            // if(this.matchedMakerOrders[order[ "order_id" ]])
            // {
            //     console.log('DONE: we have a maker ' + order[ "order_id" ])
            // }
            //
            // if(this.matchedTakerOrders[order[ "order_id" ]])
            // {
            //     console.log('DONE: we have a taker ' + order[ "order_id" ])
            // }

            var trackedOrder = this.getOrder( order[ "order_id" ] );

            if(!trackedOrder)
            {
                if(orderBook.findOrderById(order[ "order_id" ]))
                {
                    console.log('MISSING: found in the order book')

                    var bookOrder = orderBook.findOrderById(order[ "order_id" ]);

                    trackedOrder = this.createOrder(bookOrder)
                }
                else{
                    // could be because of a dropped package?
                    if(order[ "sequence" ] > this.sequence + 1)
                    {
                        // order arrived out of sequence.  The previous message was dropped
                        // add the order
                        trackedOrder = this.addOrder( order )
                        this.sequence = order[ "sequence" ];
                    }
                    if(order[ "sequence" ] < this.sequence)
                    {
                        console.log('what do we do with these orders?')
                    }
                }
            }

            emitter.emit( events.ORDER_COMPLETE, trackedOrder );
        }
        else {
            delete this.orders[ order[ "order_id" ] ];

            this.deletedOrders[ order[ "order_id" ] ] = order;
        }
    }
}


module.exports = new OrderTracker();