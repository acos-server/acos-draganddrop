# Drag-and-drop exercises

This content type for the [ACOS server](https://github.com/acos-server/acos-server) is especially designed for language learning.

To create your own exercises (in a new content package), copy the following files from the [draganddrop-example](https://github.com/acos-server/acos-draganddrop-example) content package ([NPM package](https://www.npmjs.com/package/acos-draganddrop-example)):
* package.json (modify the name and description fields)
* index.coffee (edit metadata, leave everything else untouched)

Any XML files in the `exercises` directory of the content package are recognized as exercises. 
The files may be nested in subdirectories under the `exercises` directory. 
The names of the XML files MUST NOT use any hyphens (`-`). Spaces in the filenames are not recommended. 
Look at `short.xml` and `short.json` for a very simple example of an exercise. 
Note that the ACOS server must be restarted after adding new exercises.

You must specify content (correct answers, feedback, etc.) by providing a hand-written JSON file.
The JSON file must be placed in the same directory as the exercise XML file and named similarly to the XML file
(e.g., exercise1.xml goes with exercise1.json).

# Notation

The content of the XML file is either an HTML fragment or a complete HTML document.
It is parsed with an XML parser, hence it should be syntactically correct XML as well.
The content must be wrapped in a single element. The following structure is valid:
```html
<html>
  <head>
    Head is optional.
  </head>
  <body>
    content...
  </body>
</html>
```

You can also omit the html and body tags and wrap the content in a div (or any other element).
```html
<div>
  content...
</div>
```

The following is INVALID because the entire content is not wrapped in a single element:
```html
<p>Some content</p>
<p>Some more content</p>
```


## Droppable areas (holes into which draggables may be dropped)

Droppable areas are defined in the exercise XML file with curly brackets: `{1: drop onto this}`.
They include a label to the JSON data (a string of ASCII characters, in the previous example `1`) and
the content of the droppable (in the previous example `drop onto this`). The label and the content
are separated by a colon `:`. The content may be empty (`{label:}`). The content of the droppable
is rendered in the exercise page to users while the label is only used to connect the droppable
to the correct JSON definition. The same droppable label may be used multiple times in
different holes if the droppables should use the same correct answers and the feedback.
The label `DEFAULT` may not be used as it is reserved for special use.

```html
<h1>Simple example</h1>
<p>
  Drop something here: {mylabel:}.
  You may drag-and-drop onto {ontext: the rest of this sentence}.
  We can reuse the droppable label: {mylabel: the droppable content may differ}.
</p>
```


## Draggable elements

The draggable elements, basically answers to the questions that are represented as
droppable areas in the exercise, are defined in the JSON file. The JSON defines
the content that is rendered for the draggable in the exercise page, whether
the draggable may be reused after the student has dragged it into a correct
droppable once, and what is revealed in the droppable when the draggable is dragged
there. Additionally, feedback for each draggable-droppable pair may be defined under
draggables in the JSON, but the feedback may also be defined under droppables.
The number of available draggables need not match the number
of droppables, i.e., some draggables could be incorrect to all droppables or
some draggables could be the answer to multiple droppables.

Example JSON:
```json
{
  "draggables": {
    "draglabel1": {
      "content": "&empty;",
      "feedback": {
        "droppablelabel1": "<b>Correct</b>, well done! This hole should be left empty.",
        "droppablelabel2": "Wrong! This can not be used here.",
        "droppablelabel3": "This is never used since this value is overridden in the droppables section",
        "DEFAULT": "If no more specific feedback was defined, this is used.",
      },
      "reuse": false,
      "reveal": {
        "replace": "Droppable content is replaced with this text (normally you would define only one of these reveal options)",
        "append": "This new text is appended to the droppable content (with a different font to stand out)",
        "prepend": "Like append, but prepend to the droppable content",
      },
      "htmlclass": "mycustomclass"
    },
    "draglabel2": {
      "content": "the"
    },
    "draglabel3": {
      "content": "a"
    }
  },
  "droppables": {
    ...
  }
}
```

The exercise JSON must define an object with keys `draggables` and `droppables`.
The `draggables` object defines configuration for each draggable label (`draglabel1` etc.).
The labels may be chosen freely (ASCII characters) and they are also needed
in the droppables section in the JSON file. The labels are not rendered in the exercise page.
The label `DEFAULT` may not be used as it is reserved for special use.

The configuration for each draggable label may use the following keys:
* `content` (required): HTML that is rendered in the draggable element in the page
* `feedback`: feedback HTML strings for each draggable-droppable pair.
  Feedback defined in the droppable section in the JSON takes priority if feedback is defined
  under both sections for the same pair. The key `DEFAULT` may be used to define feedback
  for the pairs that are not listed under draggables nor droppables. The `DEFAULT` key is
  first read from the droppables section.
* `reuse`: can this draggable be used again after it has been dragged to the correct droppable?
  Accepts values `true` or `false`, defaults to `true`
* `htmlclass`: if specified, this value is added to the HTML class attribute of
  the draggable element. Furthermore, it is added to the droppable element when
  the draggable is dragged to a correct droppable. The exercise XML file may define
  new CSS style rules (via `<style>` or `<link>` elements) that apply new visual
  effects, such as colours and fonts, to the custom class. Multiple classes may
  be given separated by spaces. As the content type already includes a number of
  CSS rules, using the `!important` modifier may be necessary to override some
  rules.
* `reveal`: what is revealed in the droppable when this draggable is dragged there?
  By default, the droppable content is replaced with the draggable `content`, which is
  often the desired effect when dragging text onto empty holes.
  Accepts values `false` (to disable the reveal effect completely in the droppable,
  though it returns the droppable content to its original initial state if
  another answer has modified it) or an object with one of the following keys:
  - `replace`: replace the droppable content with this HTML string
  - `append`: append this HTML string to the end of the droppable content
    (smaller font size and surrounding square brackets are added automatically).
    If another answer has modified the droppable content, the content is replaced
    with the original droppable content with the new appended value.
  - `prepend`: like `append`, but the HTML string is prepended to the start of the droppable content
  
  The `append` and `prepend` values may be used, for example, when the student is
  supposed to categorize parts of the given text. The categories are then given as
  draggables and complete sentences in the text act as droppables. The text would
  become unreadable if complete sentences were replaced with just their category,
  like "topic sentence".

* `revealCorrect` and `revealWrong`: if you want to have different reveal effects depending
  on whether the answer is correct or incorrect, use `revealCorrect` and `revealWrong`
  instead of `reveal`. You do not have to define both if the default effect is suitable
  for the other one (default: replace with the draggable content). All reveal objects
  use the same keys as previously explained under `reveal`: `replace`, `append`,
  and `prepend`. The value `false` may be used to disable the reveal effect completely.
  For example, you may disable the reveal effect for incorrect answers and use
  some effect for correct answers.
  `revealCorrect` and `revealWrong` may also be defined under the droppables section
  and those values take priority over the corresponding setting under draggables.


## JSON definitions for the droppables

The droppables section in the JSON file defines which draggables are correct answers
to each droppable. Feedback and reveal effects to the answers may be defined under either draggables or
droppables in the JSON (or mixed in both sections). Feedback and reveal effects were already explained
in the previous section.

Example JSON:
```json
{
  "draggables": {
    see the previous example
  },
  "droppables": {
    "droppablelabel1": {
      "feedback": {
        "DEFAULT": "Wrong!"
      },
      "correct": "draglabel1",
      "revealCorrect": {
        "replace": "For correct answers, the droppable content is replaced with this text. The reveal effect defined under the draggable is not used."
      }
    },
    "droppablelabel2": {
      "feedback": {
        "draglabel2": "Correct! Either \"a\" or \"the\" can be used here.",
        "draglabel3": "Correct! Either \"a\" or \"the\" can be used here.",
      },
      "correct": ["draglabel2", "draglabel3"]
    },
    "droppablelabel3": {
      "feedback": {
        "draglabel1": "Wrong! This would usualy be correct but not in this case due to X.",
        "draglabel2": "Correct!",
        "DEFAULT": "Wrong!"
      },
      "correct": "draglabel2"
    }
  }
}
```

The `droppables` object in the JSON must define configuration for each droppable label
that is used in the exercise XML file. The following keys may be defined for each droppable:
* `correct` (required): if only one draggable is the correct answer to this droppable,
  give the draggable label as a string here. Otherwise, if any one of multiple draggables
  is accepted as the correct answer, give the draggable labels in an array (`["label1", "label2", ...]`)
* `feedback`: feedback HTML strings for each draggable-droppable pair. See `feedback` in
  the draggables section for a more detailed explanation.
* `revealCorrect` and `revealWrong`: these were explained under the draggables section.
  If one or both of them are defined under the droppables, its value is used over the
  corresponding setting under draggables. Note that the reveal effect defined under the droppable
  allows you to use a certain effect when any draggable is dragged to the droppable, while
  the effect defined under the draggable may be used when the draggable is dragged into
  any droppable.


## Combined feedback

Combined feedback provides additional feedback when the student triggers a certain
combination of answers across multiple droppables.

Example JSON:
```json
{
  "draggables": {
    ...
  },
  "droppables": {
    ...
  },
  "combinedfeedback": [
    {
      "combo": [["draggablelabel1", "droppablelabel2"], ["draggablelabel2", "droppablelabel1"]],
      "feedback": "Combo: great, you got the first two right!"
    },
    {
      "combo": [["draggablelabel3", "droppablelabel1"], ["draggablelabel1", "droppablelabel2"], ["draggablelabel2", "droppablelabel3"]],
      "feedback": "This combination of words is commonly used in technical writing within computer science."
    },
    {
      "combo": [["draggablelabel1", 0], ["draggablelabel2", 1]],
      "feedback": "Combo feedback set with droppable IDs: draggables 1 and 2 dragged into the first two droppables",
      "useDroppableId": true
    }
  ]
}
```

The JSON file may define the key `combinedfeedback` in the top level if combined
feedback should be used. Using this feature is completely optional. The value of the
`combinedfeedback` key is an array that consists of objects. Each object defines
one combination. The objects use the following keys:

* `combo`: an array of 2-element arrays. The nested arrays define draggable-droppable pairs,
  i.e., answers. At least two pairs should be defined so that there is a combination
  of multiple answers, not just one. Droppables are defined by their labels by default,
  however, if the option `useDroppableId` is set, they are defined by their unique IDs.
  Droppable labels may be reused in the exercise, i.e., there may be several droppables
  with the same label and any of them could satisfy the requirement in the combo.
  If the label of a droppable is reused and only one of the droppables should be affected
  by a combo, use the droppable ID to define that one specific droppable.
  Droppable IDs start from 0 and increment sequentially. For example,
  the first droppable in the exercise has ID zero and the second has ID one
  (as seen in the exercise XML file and in the rendered web page; the order is
  not based on the JSON definition of the droppables).
  When using IDs, you must count the number of droppables in the exercise yourself so
  that you may write the correct IDs in the JSON file. The IDs must be updated if
  you add new droppables since the subsequent droppable IDs increase then.
  Note that the IDs are integers, not strings, so no quotation marks are used
  around IDs in the JSOn file.
* `feedback`: the feedback HTML string that is shown when the combination is triggered.
  The additional feedback does not replace the normal feedback.
* `useDroppableId` (optional): if set to true, the `combo` array in this object uses
  droppable IDs instead of droppable labels to define the droppables in each pair.
  By default, labels are used.


## Final comment (extra feedback after completing the exercise)

It is possible to show extra feedback to the student after the exercise has been completed.
The extra feedback or final comment may depend on the student's final score, in addition
to a common feedback phrase that is shown to everyone. The final comments and their
score limits are defined in the JSON payload under a top-level key `finalcomment`.
Final comments could be, for example, used to emphasize the important topics
studied in the exercise, to provide pointers to suitable extra reading materials,
or to just praise the student. Using final comments is optional.

Example JSON:
```
{
  "draggables": {
    ...
  },
  "finalcomment": {
    "common": "This phrase is shown to everyone after completing the exercise.",
    "50": "You got only 50% or less of the available points. You can do better!",
    "75": "Good job!",
    "99": "Excellent work!",
    "100": "Great, you got everything correct!"
  }
}
```

`finalcomment` must be an object (if it is used at all) and it may contain the
key `common` to define feedback that is shown to everyone. Other keys should be
score limits that define the feedback at the final score less than or equal to
the limit. At most one of the score-based feedback phrases is selected at a time,
thus the limits form brackets between each other. In the example JSON above,
the feedback for key `50` is active if the student gains 0-50% score, while
the feedback `75` is active for scores between 51 and 75%. The highest defined
limit should be `100` or else there is no score-based feedback for perfect solutions.


## Placement of the draggables container

By default, the draggables are rendered horizontally at the top of the exercise
web page. The placement may be modified by defining a certain `<div>` element
in the exercise XML file. If horizontal positioning should be used, define
`<div class="draganddrop-draggables"></div>` somewhere in the exercise XML,
for example, after the initial instructions and before the actual content.
The draggables container would then be rendered after the instructions close to
the content. If the browser window is small, the draggables container may still
be rendered at the top of the page, but it is then also fixed to the top so that
it stays visible when the page is scrolled down.

If the draggables should be positioned **vertically** in the **left** side, define
`<div class="draganddrop-draggables vertical"></div>` preferably as early as
possible in the exercise XML. That is to say, avoid nesting it deeply inside
other elements. If the body element is defined in the XML file, then the div
must be inside the body. If the draggables should be positioned vertically in
the **right** side, the div is `<div class="draganddrop-draggables vertical right"></div>`.

By default, the draggables are centered within the container. If the draggables
should align to the start of the container, add the class `start` to the div,
for example, `<div class="draganddrop-draggables start"></div>`. Likewise,
the class `end` causes the draggables to align to the end of the container.
These classes work with the vertical container as well. Assuming that the page
uses left-to-right direction like the English language does, the start of
a horizontal container is in the left side and the start of a vertical container
is in the top.


# Custom stylesheets

Custom CSS styles can be defined using the `<style>` tag. The `<html>` and `<head>` tags must be used in this case.
```html
<html>
  <head>
    <style>
      [custom styles]
    </style>
  </head>
  <body>
    ...
  </body>
</html>
```

Alternatively, you can create a CSS file in the static folder of the content package and include it like this:
```html
<head>
  <link href="/static/content-package-name/my-stylesheet.css" rel="stylesheet">
</head>
```


# Logging the learner's activity

This content type uses the logging functionality of the ACOS server in order to
record the learner's interactions with the exercise. The log event is sent to
the server once at the end when the learner completes the exercise. Therefore,
there is no record of activity if the learner uses the exercise without
submitting a solution nor is there a record of how much the learner studies the
feedback after completing the exercise. If the learner submits multiple solutions,
there is a record of each submission. One log event contains the activity of one
submission.

The log events are written to the log file in the following format. There are
three space-sepated fields: date, exercise data in JSON format, and protocol data
in JSON format. The date in the beginning describes the time when the event was
written to the log file and it is given in the ISO format `YYYY-MM-DDTHH:mm:ss.sssZ`.
The structure of the protocol data depends on the protocol used to connect to
the ACOS server. The exercise data is a JSON array of objects. Each object
describes one answer (one draggable dropped into one droppable) or a click on
an existing answer to see its feedback again. The objects have the following
fields:

* `qid`: droppable ID (IDs start from zero and increment sequentially)
* `qlabel`: droppable label
* `alabel`: draggable label
* `time`: time of the action given as a date in the ISO format
* `click`: if this field exists and has the boolean true value, this was not
  a new answer. The learner clicked on an existing answer to see its feedback again.
* `rerun`: if this field exists and has the boolean true value, this answer
  had already been made previously in the same droppable. Repeating the same
  wrong answer does not affect the grade, but it shows the feedback again.


# To developers

This content type is implemented in CoffeeScript. The Grunt task runner is used to
compile the code to JavaScript (see the file `Gruntfile.coffee`). The package
released to NPM must include the compiled JS code.

