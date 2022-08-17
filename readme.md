# Teleport esolang
## How to run stuff?
First run `npm install` in this folder.  
Then run `node . <path to file>`  
For example `node . ./fibonacci.telep`  
or `node . ./arrayEditor.telep`  

# How do I write it?
## Basic function
### Comments
Comments are made using two slashes `//`. There are no multiline comments.
### Signals
The program gets executed by a signal traveling from the top to the bottom.  
Each `!` spawns a signal with the value of NULL.  
The signals travel downwards along `|` symbols. They also pass through blocks like `<print>` or `[123]`.    
### Signal Values
By default the signal value is NULL.
When a signal passes through a value block like `[123]` it will do one of two things.  
If the signal was NULL, its value will be set to the value of the block.  
If the signal wasn't NULL, it will overwrite the value of the block with its own.  
Example:  
```
!
[123]
|
<print> //123
```
```
!
[456]
|
[123] // This gets overwriten with 456. If another NULL signal was to pass through this block it would become 456.
<print> //456
```
In order to set a signal value back to NULL you must use the `=` symbol. This helps to avoid overwriting value blocks.  
Example:
```
!
[123]
<print>
=
[456] //doesn't get overwriten
<print>
```

### Teleports
Teleports have the power to teleport values into another place in the code. Allowing for storing values and passing arguments from the side. All portals have a name defined after a "#" symbol.  
Here is a basic example:  
```
!
[5] -> #portal

!
| <- #portal
<print> // 5
```
The signal provides a value for a teleport using `->`.  
Then another signal fetches that value using `<-`.  
Another example in which we add 2 numbers together.
```
!
[2] -> #a

!
[4] //b
<add> <- #a
<print> // 6
```
Some functions require more than one input, then a value has to be passed from the side.  

Teleports not only can teleport values but also signals allowing for jumps. For this the arrow `<<` must be used at the destination.  
Example:
```
! 
| << #loop
[1]
<print>
| -> #loop
```
When a signal teleports it keeps it's value.  
The `<<` arrow cannot be used like a `<-` to fetch a value at any time. It can be only used for teleporting signals.
### Using teleports to make variables
```
// A basic variable starting at the value of 5
!
[5] << #set
| -> #get

!
| <- #get
<add> <- #get //results in value of 10
| -> #set     //sets the variable to 10
<print>
```
The code above is basically a function with a value block.  
The top `!` Spawns a signal and gives the value of 5 to a teleport `#get`.  
This makes it possible to fetch the value from anywhere using `<- #get`.

When the signal reaches `| -> #set` it already has the value of 10. It teleports back up to the value block `[5]` and since the signal value isn't NULL, it overwrites the value block with the number 10 and gives the `#get` teleport the value of 10. Afterwards it returns to the bottom part to reach `<print>`. The value doesn't persist when you return.

### Conditionals
The `?` symbol is used for conditional jumps.
Example:
```
!
[1]
? -> #jump // This one will be printed

!
[0]
? -> #jump // This one will not be printed

| << #jump
<print>
```
The `?` checks if the value that enters from the top is different than 0 / NULL / false.  
Unlike a normal jump, this one will not return after executing the code at its jump target location.

```
| << #conditionalJump
=
["I'm here 1"]
<print>

!
["I'm here 2"]
<print>
| -> #conditionalJump
=
["I'm here 3"]
<print>
=
[1]
? -> #conditionalJump
=
["I'm here 4"] // This part will never get executed
<print>
```
Logical comparators like `<eq>`, `<neq>`, `<les>` etc. are useful for conditional jumps and return either true or false.

### Other data types
We can create strings simply by using quotation marks `""` inside a value block.  
```
!
["This is a string!"]
<print>
```

`<input>` by default returns a string but often we want the user to input a number.  
For this conversion functions are used like `<tonum>`.  
Example:  
```
!
["Input a number: "]
<input>
<tonum>
| -> #num
<add> <- #num
<print> // input * 2
```

There are also arrays. To create an array use curly brackets inside a value block.  
```
!
[{5, 4, "text", 7}]
<print>
```
You can convert strings into arrays and back using `<toarr>` and `<tostr>`.  
Example:
```
!
["string"]
<toarr>
<print> // [ 's', 't', 'r', 'i', 'n', 'g' ]
<tostr>
<print> // string
```
### Working with arrrays
You can set and get elements of an array using `<at>` and `<set>`.
`<at>` gets the array from the top and the index from the side.  
```
!
[1]
| -> #index

!
[{5,4,3,2,1}]
|
<at> <- #index
|
<print> // 4
```
`<set>` also gets the array from the top.  
It will work differently depending on what is the input on it's side.  
If a number or a string enters from its side it will append it to the end of the array.
```
!
["new"]
| -> #el1

!
[5]
| -> #el2

!
[{1,2,3}]
<set> <- #el1
<print> //[ 1, 2, 3, 'new' ]
<set> <- #el2
<print> //[ 1, 2, 3, 'new', 5 ]
```
If an array enters from it's side, it will be used to specify the key / index and the value to write into the array. That input array has to be the length of 2.  
```
!
[{4,"overwrite!"}]
| -> #newVal

!
[{9,8,7,6,5,4,3,2,1}]
<set> <- #newVal
<print> // [ 9, 8, 7, 6, 'overwrite!', 4, 3, 2, 1 ]
```


## Functions
### &lt;print&gt;
Prints the variable passed from above  
### &lt;input&gt;
Prompts user for input. Displays message passed from above.  
Returns whatever the user typed **as a string**.  
### &lt;at&gt;
Returns the element at the index of an array.  
The array enters from above.  
The index enters from the side.  
### &lt;set&gt;
Sets the value at an index of an array or adds new element to array.  
Array enters from above.
From the side enters either a value to add to the end of the array or a table consisting of two elements: Key and Value [k, v].
### &lt;add&gt; &lt;sub&gt; &lt;mul&gt; &lt;div&gt;
Mathematical operations.  
First argument enters from the top, second from the side.  
### &lt;eq&gt; &lt;neq&gt; &lt;les&gt; &lt;mor&gt; &lt;lesq&gt; &lt;morq&gt;
Logical operations. 
First argument enters from the top, second from the side. 
### &lt;tonum&gt; &lt;tostr&gt; &lt;toarr&gt;
Convert input to a number / string / array.  
The input enters from the top.
## Debugger
To use the debuger add use the `--debug` argument.  
Define breakpoints in the `--break` argument.  
```
node . ./fibonacci.telep --debug --break:15,19
```