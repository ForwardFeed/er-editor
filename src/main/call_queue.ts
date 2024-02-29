
type Call = ()=>void
/**
 * Prevents from stacking files involved asynchrounous call or any sort of race conditions
 * Please note that this is a lazy queue that requires to be unlocked and polled to make it process
 */
export class CallQueue{
    queue: Array<Call> = []
    lock: boolean = false
    constructor(){

    }
    feed(call: Call): CallQueue{
        this.queue.push(call)
        return this
    }
    /**
     * manually poll the queue to make it go for the next queued call
     */
    poll(): CallQueue{
        if (this.lock) return this
        if (this.queue.length == 0) return this
        this.lock = true
        const funcall = this.queue.splice(0, 1)[0]
        funcall()
        return this
    }
    unlock(): CallQueue{
        this.lock = false
        return this
    }
}