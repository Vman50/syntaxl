// Puzzle bank: letters only (a-z). Each entry is [word, hint].
const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const BANK = {
  Python: [
    [["print","Outputs text to the console"],["input","Reads a line from the user"],["while","Loop that runs as long as a condition is true"],["break","Exits a loop early"],["float","Type for decimal numbers"],["range","Generates a sequence of integers for loops"]],
    [["lambda","Keyword for an anonymous function"],["yield","Makes a function a generator"],["import","Brings in a module"],["enumerate","Built-in giving (index, item) pairs"],["append","List method that adds to the end"],["global","Declares a module-level name inside a function"]],
    [["async","Marks a coroutine function (with def)"],["await","Suspends until an awaitable completes"],["nonlocal","Rebinds a name in an enclosing function scope"],["metaclass","The class of a class"],["decorator","Wraps a function using @ syntax"],["dataclass","Decorator that auto-generates __init__ and friends"]]
  ],
  JavaScript: [
    [["const","Declares a block-scoped constant"],["array","Ordered list type, written with []"],["function","Keyword that declares a reusable block of code"],["alert","Pops up a browser dialog"],["return","Sends a value back from a function"]],
    [["promise","Object representing a future value"],["filter","Array method keeping matching items"],["reduce","Array method folding to a single value"],["typeof","Operator returning a value's type as a string"],["spread","The ... operator when expanding an iterable"],["fetch","Browser API for HTTP requests"]],
    [["closure","Function remembering its lexical scope"],["prototype","Object every JS object inherits from"],["hoisting","Declarations moving to the top of their scope"],["generator","Function* that can pause with yield"],["symbol","Unique primitive often used as a key"],["proxy","Object that intercepts operations on another"]]
  ],
  Java: [
    [["class","Blueprint for objects"],["public","Access modifier visible everywhere"],["static","Belongs to the class, not an instance"],["void","Return type meaning nothing"],["string","Text type (capitalised in Java)"],["import","Pulls in a package"]],
    [["extends","Inherits from a superclass"],["interface","Contract of abstract methods"],["final","Prevents reassignment or overriding"],["throws","Declares checked exceptions on a method"],["package","Namespaces a group of classes"],["override","Annotation for redefining a superclass method"]],
    [["abstract","Class or method without a full implementation"],["volatile","Ensures visibility of a field across threads"],["transient","Field skipped by serialization"],["generics","Type parameters like List<T>"],["stream","API for functional pipelines over collections"],["optional","Container that may or may not hold a value"]]
  ],
  C: [
    [["char","Single-byte character type"],["void","Type with no value"],["while","Loop keyword"],["printf","Formatted output function"],["return","Leaves a function"]],
    [["struct","Groups fields into a compound type"],["malloc","Allocates heap memory"],["sizeof","Operator giving a type's size in bytes"],["typedef","Creates a type alias"],["switch","Multi-way branch on an integer"],["static","Gives internal linkage or persistent storage"]],
    [["pointer","Variable holding a memory address"],["volatile","Tells the compiler a value may change unexpectedly"],["register","Hint to keep a variable in a CPU register"],["realloc","Resizes a heap block"],["union","Members share the same memory"],["segfault","Crash from an invalid memory access"]]
  ],
  "C++": [
    [["cout","Standard output stream"],["class","User-defined type with members"],["string","Standard text type"],["vector","Dynamic array in the STL"],["using","As in 'using namespace std'"],["endl","Newline plus flush"]],
    [["template","Generic programming keyword"],["namespace","Named scope to avoid collisions"],["virtual","Enables runtime polymorphism"],["iterator","Object that walks a container"],["const","Marks something read-only"],["public","Access specifier"]],
    [["constexpr","Evaluated at compile time"],["decltype","Yields the type of an expression"],["noexcept","Promises a function will not throw"],["lvalue","Expression with an identifiable location"],["rvalue","Temporary you can move from"],["destructor","Runs when an object is destroyed"]]
  ],
  Rust: [
    [["match","Exhaustive pattern matching"],["loop","Infinite loop"],["struct","Custom data type"],["println","Macro that prints a line"]],
    [["borrow","Take a reference without ownership"],["option","Enum of Some or None"],["result","Enum of Ok or Err"],["trait","Shared behavior, like an interface"],["mutable","What 'mut' means"]],
    [["lifetime","Annotation like 'a on references"],["unsafe","Opts out of some compiler guarantees"],["cargo","Rust's package manager and build tool"],["closure","Anonymous function |x| x + 1"],["ownership","Each value has exactly one owner"]]
  ],
  Go: [
    [["func","Declares a function"],["package","Every file starts with one"],["import","Brings in packages"],["string","Text type"],["range","Iterates over slices and maps"],["return","Exits a function"]],
    [["slice","Dynamic view over an array"],["struct","Composite type with fields"],["defer","Runs a call when the function returns"],["interface","Set of method signatures"],["channel","Typed conduit between goroutines"],["select","Waits on multiple channel operations"]],
    [["goroutine","Lightweight concurrent function"],["mutex","Mutual exclusion lock"],["context","Carries deadlines and cancellation"],["panic","Aborts normal control flow"],["recover","Regains control after a panic"],["waitgroup","Waits for goroutines to finish"]]
  ],
  SQL: [
    [["select","Retrieves rows"],["from","Names the source table"],["where","Filters rows"],["insert","Adds a new row"],["update","Modifies existing rows"],["delete","Removes rows"]],
    [["join","Combines rows from two tables"],["group","Clause used with BY to aggregate"],["order","Clause used with BY to sort"],["having","Filters groups after aggregation"],["limit","Caps number of rows returned"],["distinct","Removes duplicate rows"]],
    [["index","Speeds up lookups on a column"],["trigger","Runs automatically on a table event"],["cursor","Row-by-row result iterator"],["window","Kind of function used with OVER"],["primary","Kind of key uniquely identifying a row"],["foreign","Kind of key referencing another table"]]
  ],
  "HTML/CSS": [
    [["body","Element holding visible page content"],["link","Element that connects a stylesheet"],["color","Property setting text colour"],["image","What img displays"],["title","Element naming the page in the tab"]],
    [["flex","display value for one-dimensional layout"],["grid","display value for two-dimensional layout"],["margin","Space outside an element's border"],["padding","Space inside an element's border"],["hover","Pseudo-class for mouse-over"],["border","Line around an element"]],
    [["cascade","The C in CSS: rules deciding which style wins"],["viewport","Meta tag target for responsive scaling"],["keyframes","At-rule that defines an animation sequence"],["semantic","Kind of HTML that conveys meaning, like nav"],["transform","Property for rotate, scale and translate"],["pseudo","Kind of element or class like ::before"]]
  ],
  Ruby: [
    [["puts","Prints with a newline"],["class","Defines a type"],["array","Ordered collection"],["string","Text object"]],
    [["symbol","Immutable name like :foo"],["block","Chunk of code passed to a method"],["yield","Calls the block passed in"],["module","Mixin container"],["hash","Key-value collection"],["require","Loads a file or gem"]],
    [["proc","Object wrapping a block"],["lambda","Strict-arity proc"],["mixin","Behavior shared via include"],["gemfile","Lists a project's dependencies"],["refinement","Scoped monkey patch"]]
  ]
};
