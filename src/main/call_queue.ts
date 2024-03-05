const { dialog } = require('electron')

type Call = ()=>void
/**
 * Prevents from stacking files involved asynchrounous call or any sort of race conditions
 * Please note that this is a lazy queue that requires to be unlocked and polled to make it process
 */
export class CallQueue{
    name: string
    queue: Array<Call> = []
    lock: number = 0
    warning: boolean = false
    timeoutWarn: NodeJS.Timeout = 0 as unknown as NodeJS.Timeout
    constructor(name: string = "Not Set" , warning: boolean = true){
        this.warning = warning
        this.name = name
    }
    /**
     * adds a callback
     */
    feed(call: Call): CallQueue{
        this.queue.push(call)
        return this
    }
    /**
     * adds a lock
     */
    addLock(){
        this.lock += 1
        return this
    }
    /**
     * manually poll the queue to make it go for the next queued call
     */
    poll(): CallQueue{
        if (this.lock) {
            if (this.warning && !this.timeoutWarn) this.timeoutWarn = setTimeout(()=>{
                dialog.showErrorBox('Error while editing',`Editions of ${this.name} has been locked for now 5 seconds, something has bugged and for data protection nothing related to ${this.name} can\
 be edited, apologies for the inconvenience`)
                console.error('error locking too long of call queue ' + this.lock)
            }, 5000)
            return this
        }
        if (this.warning) clearTimeout(this.timeoutWarn)
        if (this.queue.length == 0) return this
        this.lock += 1
        const funcall = this.queue.splice(0, 1)[0]
        funcall()
        return this
    }
    /**
     * remove one lock
     */
    unlock(): CallQueue{
        this.lock = this.lock == 0 ? 0 : this.lock - 1
        return this
    }
}