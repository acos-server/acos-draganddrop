;(function($, window, document, undefined) {
  "use strict";
  
  var pluginName = 'acosDragAndDrop';
  var defaults = {
    feedback_selector: '.draganddrop-feedback',
    points_selector: '.draganddrop-points',
    correct_answers_selector: '.draganddrop-correct-answers',
    wrong_answers_selector: '.draganddrop-wrong-answers',
    completed_selector: '.draganddrop-complete',
    droppable_selector: '.droppable',
    draggable_selector: '.draggable',
    draggable_class: 'draggable',
    content_selector: '.draganddrop-content',
    draggables_selector: '.draganddrop-draggables', // container for draggable elements
    info_selector: '.draganddrop-info',
    complete_msg_attr: 'data-msg-complete',
    complete_uploading_msg_attr: 'data-msg-complete-uploading',
    complete_uploaded_msg_attr: 'data-msg-complete-uploaded',
    complete_error_msg_attr: 'data-msg-complete-error',
    completed_msg_selector: '.draganddrop-complete-msg',
    final_comment_selector: '.draganddrop-finalcomment',
    final_points_msg_attr: 'data-msg-final',
    drags_left_msg_selector: '.draganddrop-dragsleftmsg', // correct answers left
    drags_left_singular_msg_attr: 'data-msg-singular',
    drags_left_plural_msg_attr: 'data-msg-plural',
  };
  
  function AcosDragAndDrop(element, options) {
    this.element = $(element);
    this.settings = $.extend({}, defaults, options);
    
    this.completed = false;
    // answers made to each droppable (no duplicates even if the same answer is repeated) (key: droppable unique id)
    this.questionAnswered = {};
    this.droppablesByLabel = {}; // array of droppable unique ids for each droppable label (key: droppable label)
    this.latestAnswers = {}; // latest answer for each droppable (key: droppable unique id)
    this.origDropContents = {}; // original HTML contents of the droppables (key: droppable unique id)
    this.feedbackDiv = this.element.find(this.settings.feedback_selector);
    this.pointsDiv = this.element.find(this.settings.points_selector);
    this.completeDiv = this.element.find(this.settings.completed_selector);
    this.completeMsg = this.element.find(this.settings.completed_msg_selector);
    this.finalComment = this.element.find(this.settings.final_comment_selector);
    this.correctPointsElem = this.element.find(this.settings.correct_answers_selector);
    this.wrongPointsElem = this.element.find(this.settings.wrong_answers_selector);
    this.dragsLeftMsgDiv = this.element.find(this.settings.drags_left_msg_selector);
    this.contentDiv = this.element.find(this.settings.content_selector);
    this.draggablesContainer = this.element.find(this.settings.draggables_selector);
    this.infoDiv = this.element.find(this.settings.info_selector);
    this.correctAnswers = 0;
    this.incorrectAnswers = 0;
    this.maxCorrectAnswers = this.element.find(this.settings.droppable_selector).length; // total correct answers in the exercise
    this.answerLog = []; // all answers (drags) for logging
    this.draggablesPayload = window.draganddrop.draggables;
    this.droppablesPayload = window.draganddrop.droppables;
    this.dragData = null; // drag data stored here in case the native API hides it
    this.init();
  }
  
  $.extend(AcosDragAndDrop.prototype, {
  
    init: function() {
      var self = this;
      // create draggable elements based on payload data
      for (var id in this.draggablesPayload) {
        if (this.draggablesPayload.hasOwnProperty(id)) {
          var text = this.draggablesPayload[id].content;
          var customClass = this.draggablesPayload[id].htmlclass;
          
          var dragElem = $('<span>');
          dragElem
            .addClass(self.settings.draggable_class)
            .attr('data-label', id)
            .attr('draggable', 'true')
            .html(text)
            .appendTo(self.draggablesContainer);
          if (customClass) {
            // set custom class to the draggable element, if the payload defines it
            // multiple classes may be given in one space-separated string
            dragElem.addClass(customClass);
          }
        }
      }
      
      var idCounter = 0;
      // attach event handlers to the draggable and droppable elements in the exercise as well as
      // generate and add unique IDs to the droppable elements
      this.element.find(this.settings.droppable_selector).each(function() {
        var uniqueId = idCounter++;
        $(this).data('id', uniqueId);
        
        var questionLabel = $(this).data('label'); // labels are set by the teacher, they may repeat the same values
        if (Array.isArray(self.droppablesByLabel[questionLabel])) {
          self.droppablesByLabel[questionLabel].push(uniqueId);
        } else {
          self.droppablesByLabel[questionLabel] = [uniqueId];
        }
        
        self.questionAnswered[uniqueId] = [];
        // the array will contain the draggable labels corresponding to answers made by the user
        // on this droppable (no duplicate values are added to the array)
        
        self.latestAnswers[uniqueId] = null; // latest answer (draggable label) on this droppable
        
        self.origDropContents[uniqueId] = $(this).html();
      })
      .on('dragover', function(e) {
        self.handleDragOver(e, $(this));
      })
      .on('dragenter', function(e) {
        self.handleDragEnter(e, $(this));
      })
      .on('dragleave', function(e) {
        self.handleDragLeave(e, $(this));
      })
      .on('drop', function(e) {
        self.handleDrop(e, $(this));
      })
      .on('click', function(e) {
        // show feedback again for this droppable
        self.handleDroppableClick(e, $(this));
      });
      // Note about event handlers: this is the element which the handler is attached to,
      // while event.target may be a child element.
      
      this.draggablesContainer.find(this.settings.draggable_selector)
        .on('dragstart', function(e) {
          self.handleDragStart(e, $(this));
        })
        .on('dragend', function(e) {
          self.handleDragEnd(e, $(this));
        });
      
      // use fixed positioning for the info and draggables containers
      // if they cannot be seen on the screen otherwise
      this.setInfoPosition();
      this.setDraggablesPosition();
      $(window).on('resize', function() {
        self.setInfoPosition();
        self.setDraggablesPosition();
      });
    },
    
    // Event handlers for drag-and-drop (native HTML5 API)
    handleDragStart: function(e, dragElem) {
      e.originalEvent.dataTransfer.effectAllowed = 'copy';
      e.originalEvent.dataTransfer.dropEffect = 'copy';
      
      // if <img> is used in the draggable, set it to the drag image so that
      // the drag image never includes the draggable box by default, only the image
      var draggableImg = dragElem.find('img');
      if (draggableImg.length) {
        var img = draggableImg.get(0);
        try {
          e.originalEvent.dataTransfer.setDragImage(img, img.width / 2, 0);
        } catch (ex) {
          // ignore, some browsers do not support setting the drag image
        }
      }
      
      dragElem.css('opacity', '0.5');
      
      var dragData = dragElem.data('label');
      try {
        e.originalEvent.dataTransfer.setData('text/plain', dragData);
      } catch (ex) {
        // Internet Explorer does not support the "text/plain" data type
        e.originalEvent.dataTransfer.setData('text', dragData);
      }
      this.dragData = dragData; // keep the data in a variable since the drag-and-drop API is unreliable
    },
    
    handleDragOver: function(e, dropElem) {
      var draggableLabel = null;
      try {
        draggableLabel = e.originalEvent.dataTransfer.getData('text/plain');
      } catch (ex) {
        // for Internet Explorer
        draggableLabel = e.originalEvent.dataTransfer.getData('text');
      }
      if (!draggableLabel) {
        // fallback when the native API fails
        draggableLabel = this.dragData;
      }
      if (draggableLabel && this.draggablesPayload[draggableLabel] && !dropElem.hasClass('correct')) {
        e.preventDefault(); // allow drop
        
        e.originalEvent.dataTransfer.dropEffect = 'copy';

        return false;
      }
      return true;
    },
    
    handleDragEnter: function(e, dropElem) {
      e.preventDefault(); // really needed?
      if (!dropElem.hasClass('correct')) {
        // the droppable has not been correctly answered yet so add a class for styling while hovering over it
        dropElem.addClass('over');
      }
    },
    
    handleDragLeave: function(e, dropElem) {
      dropElem.removeClass('over');
    },
    
    handleDrop: function(e, dropElem) {
      e.stopPropagation(); // stops the browser from redirecting
      e.preventDefault();

      var draggableLabel = null;
      try {
        draggableLabel = e.originalEvent.dataTransfer.getData('text/plain');
      } catch (ex) {
        // for Internet Explorer
        draggableLabel = e.originalEvent.dataTransfer.getData('text');
      }
      if (!draggableLabel) {
        // fallback when the native API fails
        draggableLabel = this.dragData;
      }
      
      var droppableLabel = dropElem.data('label');
      this.checkAnswer(draggableLabel, droppableLabel, dropElem);

      return false;
    },

    handleDragEnd: function(e, dragElem) {
      dragElem.css('opacity', ''); // remove the inline style set in dragstart
      this.element.find(this.settings.droppable_selector).removeClass('over');
      this.dragData = null;
      
      if (this.completed) {
        // if the exercise has been completed, detach the drag event handlers
        // do it here so that the drag event for the last answer may finish normally
        this.detachDragEventHandlers();
      }
    },
    
    // show feedback for a droppable again if it is clicked
    handleDroppableClick: function(e, dropElem) {
      e.stopPropagation();
      e.preventDefault();
      
      var dropId = dropElem.data('id');
      var answers = this.questionAnswered[dropId];
      if (answers.length < 1) {
        // not answered yet, do nothing
        return false;
      }
      
      var draggableLabel = this.latestAnswers[dropId];
      var droppableLabel = dropElem.data('label');
      var feedback = this.getFeedback(draggableLabel, droppableLabel, dropId);
      this.updateFeedback(feedback, this.isCorrectAnswer(draggableLabel, droppableLabel));
      
      if (!this.completed) {
        // Log this click event (which shows that the learner wanted to study the feedback again).
        // The log event is sent when the exercise is completed and thus
        // it is unnecessary to keep track of clicks after that.
        var logPayload = {
          qid: dropId, // question (droppable)
          qlabel: droppableLabel,
          alabel: draggableLabel, // answer (draggable)
          time: new Date().toISOString(), // current time
          click: true, // separate clicks and drags
          // click events are not real answers as they only show the feedback again
          // for a previously made answer
        };
        this.answerLog.push(logPayload);
      }
      
      return false;
    },
    
    // check the answer and do everything else that is necessary and not related to the drag-and-drop API:
    // update UI, check completion and send grading when finished
    checkAnswer: function(draggableLabel, droppableLabel, droppableElem) {
      // if the exercise has been completed or
      // if the correct answer has been given for this droppable, ignore the drag event
      if (this.completed || droppableElem.hasClass('correct')) {
        return;
      }
      
      var dropId = droppableElem.data('id');
      this.latestAnswers[dropId] = draggableLabel;
      
      // Has the draggable already been dragged on the droppable previously?
      // It is possible to repeat the same wrong answer before the correct answer is found,
      // but repeating the same wrong answer does not affect grading.
      var wasAnswered = true;
      if (this.questionAnswered[dropId].indexOf(draggableLabel) === -1) {
        this.questionAnswered[dropId].push(draggableLabel);
        wasAnswered = false;
      }
      
      var dragPayload = this.draggablesPayload[draggableLabel];
      //var dropPayload = this.droppablesPayload[droppableLabel];
      var isCorrect = this.isCorrectAnswer(draggableLabel, droppableLabel);
      
      var feedback = this.getFeedback(draggableLabel, droppableLabel, dropId);
      this.updateFeedback(feedback, isCorrect);
      droppableElem.removeClass('correct wrong');
      if (isCorrect) {
        droppableElem.addClass('correct');
        if (dragPayload.htmlclass) {
          droppableElem.addClass(dragPayload.htmlclass);
        }
        
        if (!wasAnswered) {
          this.correctAnswers++;
        }
        // if the same draggable should not be reused after finding the correct droppable for it (default: allow reuse)
        if (dragPayload.reuse === false) {
          this.disableDraggable(draggableLabel);
        }
      } else {
        droppableElem.addClass('wrong');
        if (!wasAnswered) {
          this.incorrectAnswers++;
        }
      }
      
      // reveal text defined by the draggable in the droppable
      this.revealAnswerInDroppable(draggableLabel, droppableElem, isCorrect);
      
      this.updatePoints();
      this.updateCorrectDragsLeftMessage();
      
      // save the answer for logging (even if the same answer had already been made
      // since it may be useful data)
      // the full log is uploaded to the ACOS server at the end
      // with the label a log analyzer can check if the answer was correct or not
      // (exercise JSON payload has the same labels)
      // droppable IDs are unique, labels may be reused
      // the aplus protocol adds a user id to the payload
      var logPayload = {
        qid: dropId, // question (droppable)
        qlabel: droppableLabel,
        alabel: draggableLabel, // answer (draggable)
        time: new Date().toISOString(), // current time
      };
      if (wasAnswered) {
        // this answer had already been made previously
        logPayload.rerun = true;
      }
      this.answerLog.push(logPayload);
      
      this.checkCompletion();
    },
    
    getFeedback: function(draggableLabel, droppableLabel, droppableId) {
      var feedback;
      var dropPl = this.droppablesPayload[droppableLabel];
      var dragPl = this.draggablesPayload[draggableLabel];
      if (dropPl.feedback && dropPl.feedback[draggableLabel]) {
        feedback = dropPl.feedback[draggableLabel];
      } else if (dragPl.feedback && dragPl.feedback[droppableLabel]) {
        feedback = dragPl.feedback[droppableLabel];
      } else if (dropPl.feedback && dropPl.feedback.DEFAULT) {
        feedback = dropPl.feedback.DEFAULT;
      } else if (dragPl.feedback && dragPl.feedback.DEFAULT) {
        feedback = dragPl.feedback.DEFAULT;
      } else {
        feedback = '[ERROR: no feedback set]';
      }
      
      // check combined feedback and add it if necessary
      feedback += this.getComboFeedback(draggableLabel, droppableLabel, droppableId, true);
      
      return feedback;
    },
    
    getComboFeedback: function(draggableLabel, droppableLabel, droppableId, inHtml) {
      // inHtml: if true or undefined, return combined feedback as an HTML string.
      //   If false, return an array of strings (based on the payload, so they may have HTML formatting).
      if (!window.draganddrop.combinedfeedback) {
        // no combined feedback in the exercise
        return inHtml === false ? [] : '';
      }
      var feedback = [];
      var len = window.draganddrop.combinedfeedback.length;
      // loop over all combined feedback and for each combination, check if the conditions are fulfilled
      for (var i = 0; i < len; ++i) {
        var comboObj = window.draganddrop.combinedfeedback[i];
        if (comboObj.combo && comboObj.feedback) {
          var comboFulfilled = true; // are all conditions (pairs) satisfied?
          var currentAnswerInCombo = false;
          // useDropId: if true, second part of the combo pair is a droppable unique id, not label
          var useDropId = comboObj.useDroppableId === true;
          // loop over the answers (draggable-droppable pairs) in the combo:
          // each pair must be satisfied in order to fulfill the combo
          for (var j = 0; j < comboObj.combo.length; ++j) {
            var pair = comboObj.combo[j]; // draggable label, droppable label/id
            // Check if the current answer is part of the combo
            // (one pair must match with the current answer): if not, the combo is not triggered.
            // no type checking in the if since integer labels may be integers or strings
            // after parsing JSON/HTML and accessing via the jQuery data API
            if (!currentAnswerInCombo && pair[0] == draggableLabel &&
                ((!useDropId && pair[1] == droppableLabel) || (useDropId && pair[1] == droppableId))) {
              currentAnswerInCombo = true;
            }
            
            // check if this pair is satisfied, i.e., the latest answer in the droppable is the draggable given in the pair
            var pairSatisfied = false;
            if (useDropId) {
              if (this.latestAnswers[pair[1]] === pair[0]) {
                pairSatisfied = true;
              }
            } else {
              // droppables may reuse the same label, hence all of those droppables must be
              // checked to see if their answer is part of the combo
              for (var k = 0; k < this.droppablesByLabel[pair[1]].length; ++k) {
                var dropId = this.droppablesByLabel[pair[1]][k];
                if (this.latestAnswers[dropId] === pair[0]) {
                  pairSatisfied = true;
                  break;
                }
              }
            }
            if (!pairSatisfied) {
              // this combo is not fulfilled since this pair is missing
              comboFulfilled = false;
              break;
            }
          }
          
          // are the conditions for this combined feedback fulfilled?
          if (comboObj.combo.length > 0 && comboFulfilled && currentAnswerInCombo) {
            feedback.push(comboObj.feedback);
          }
        }
      }
      
      if (inHtml === false) {
        return feedback;
      } else {
        var html = '';
        var len = feedback.length;
        for (var i = 0; i < len; ++i) {
          html += '<br>' + '<span class="draganddrop-combinedfeedback">' + feedback[i] + '</span>';
        }
        return html;
      }
    },
    
    isCorrectAnswer: function(draggableLabel, droppableLabel) {
      var dropPayload = this.droppablesPayload[droppableLabel];
      var isCorrect = false;
      if (Array.isArray(dropPayload.correct)) {
        if (dropPayload.correct.indexOf(draggableLabel) !== -1) {
          // is the draggableLabel in the array of expected correct draggables?
          isCorrect = true;
        }
      } else {
        if (dropPayload.correct === draggableLabel) {
          isCorrect = true;
        }
      }
      return isCorrect;
    },
    
    checkCompletion: function() {
      if (this.correctAnswers >= this.maxCorrectAnswers) {
        this.completed = true;
        this.dragsLeftMsgDiv.hide();
        this.completeMsg.text(this.completeDiv.attr(this.settings.complete_msg_attr));
        this.completeDiv.removeClass('hide').show();
        this.grade();
        this.sendLog();
      }
    },
    
    grade: function() {
      var self = this;
      
      if (window.location.pathname.substring(0, 6) !== '/html/') {
        // hide this uploading message when acos html protocol is used since it does not store any grading
        this.completeMsg.text(this.completeDiv.attr(this.settings.complete_uploading_msg_attr));
      }
      
      var scorePercentage = Math.round(this.maxCorrectAnswers / (this.correctAnswers + this.incorrectAnswers) * 100);
      
      // show final points
      this.addFinalPointsString(this.pointsDiv, scorePercentage);
      // final comment may be defined in the exercise payload and depends on the final points
      this.showFinalComment(scorePercentage);
      // feedback for the grading event that is sent to the server
      var feedback = this.buildFinalFeedback();
      if (window.ACOS) {
        // set max points to 100 since the points are given as a percentage 0-100%
        ACOS.sendEvent('grade', { max_points: 100, points: scorePercentage, feedback: feedback }, function(content, error) {
          if (error) {
            // error in uploading the grading result to the server, show a message to the user
            self.completeMsg.text(self.completeDiv.attr(self.settings.complete_error_msg_attr) + error.error);
            return;
          }
          // the grading result has been sent to the server
          if (window.location.pathname.substring(0, 6) !== '/html/') {
            // hide this uploading message when acos html protocol is used since it does not store any grading
            self.completeMsg.text(self.completeDiv.attr(self.settings.complete_uploaded_msg_attr));
          }
        });
      }
    },
    
    sendLog: function() {
      if (window.ACOS) {
        window.ACOS.sendEvent('log', this.answerLog);
      }
    },
    
    // disable a draggable element so that it cannot be dragged anymore
    disableDraggable: function(draggableLabel) {
      var dragElem = this.draggablesContainer.find(this.settings.draggable_selector + "[data-label='" + draggableLabel + "']");
      dragElem.attr('draggable', 'false').addClass('disabled');
      // if the draggable contains <img> or <a> elements, they are draggable by default
      // and dragging must be disabled separately
      dragElem.find('img, a').attr('draggable', 'false');
    },
    
    updatePoints: function() {
      this.correctPointsElem.text(this.correctAnswers);
      this.wrongPointsElem.text(this.incorrectAnswers);
      this.pointsDiv.removeClass('hide').show();
    },
    
    updateCorrectDragsLeftMessage: function() {
      if (this.correctAnswers >= 0.5 * this.maxCorrectAnswers) {
        var left = this.maxCorrectAnswers - this.correctAnswers; // how many correct answers left
        var msgAttr = (left === 1) ? this.settings.drags_left_singular_msg_attr : this.settings.drags_left_plural_msg_attr;
        var msg = this.dragsLeftMsgDiv.attr(msgAttr);
        msg = msg.replace('{counter}', left.toString());
        this.dragsLeftMsgDiv.html(msg);
        this.dragsLeftMsgDiv.removeClass('hide').show();
      }
    },
    
    updateFeedback: function(feedback, isCorrect) {
      this.feedbackDiv.html(feedback).removeClass('correct wrong');
      if (isCorrect) {
        this.feedbackDiv.addClass('correct');
      } else {
        this.feedbackDiv.addClass('wrong');
      }
    },
    
    showFinalComment: function(score) {
      var payload = window.draganddrop.finalcomment;
      if (!payload) {
        return;
      }
      var html = '';
      if (payload.common) {
        // always show this comment
        html += payload.common + '<br>';
      }
      
      var limits = [];
      // convert limits to numbers so that they may be compared
      for (var key in payload) {
        if (payload.hasOwnProperty(key)) {
          var limit = parseInt(key, 10);
          if (!isNaN(limit)) {
            limits.push([limit, key]);
          }
        }
      }
      
      limits.sort(function(a, b) {
        if (a[0] < b[0])
          return -1;
        else if (a[0] > b[0])
          return 1;
        else
          return 0;
      });
      
      var feedbackIdx = limits.findIndex(function(elem) {
        return score <= elem[0];
      });
      if (feedbackIdx !== -1) {
        html += payload[limits[feedbackIdx][1]];
      }
      
      this.finalComment.html(html);
    },
    
    revealAnswerInDroppable: function(draggableLabel, droppableElem, isCorrect) {
      var dropId = droppableElem.data('id');
      var dragPayload = this.draggablesPayload[draggableLabel];
      // if the reveal value is not defined in the payload,
      // the default action is to replace the droppable content with the draggable content
      if (dragPayload.reveal === false ||
          (dragPayload.revealCorrect === false && isCorrect) ||
          (dragPayload.revealWrong === false && !isCorrect)) {
        // if the reveal value is set to false in the payload,
        // do not reveal anything and keep the droppable text intact
        // The original content is set back here incase other answers have replaced
        // the droppable content with something else.
        droppableElem.html(this.origDropContents[dropId]);
        return;
      }
      
      // helper function for reading different types of reveal effects from the payload
      var getRevealValues = function(obj, arr) {
        var keys = ['replace', 'append', 'prepend'];
        for (var i = 0; i < keys.length; ++i) {
          if (obj.hasOwnProperty(keys[i])) {
            arr[i] = obj[keys[i]];
          }
        }
      };
      
      var replace = false;
      var append = false;
      var prepend = false;
      var revealArray = [replace, append, prepend];
      var useDefault = false;
      
      /* The draggable paylod may define the same reveal effects for both correct and
      incorrect answers, or separately for correct and incorrect answers. If the shared
      reveal effect is defined (field reveal), it is always used and the others are
      ignored (fields revealCorrect and revealWrong). Any kind of reveal is an object
      in the payload with one of the keys defined: replace, append, or prepend.
      */
      if (dragPayload.reveal) {
        getRevealValues(dragPayload.reveal, revealArray);
      } else if (dragPayload.revealCorrect && isCorrect) {
        getRevealValues(dragPayload.revealCorrect, revealArray);
      } else if (dragPayload.revealWrong && !isCorrect) {
        getRevealValues(dragPayload.revealWrong, revealArray);
      } else {
        // use default behaviour: replace with the draggable content
        useDefault = true;
      }
      
      if (useDefault) {
        replace = dragPayload.content;
      } else {
        replace = revealArray[0]; // the content that replaces the old one
        append = revealArray[1];
        prepend = revealArray[2];
      }
      var prependWrap = '';
      var replaceWrap = '';
      var appendWrap = '';
      
      // nested <span> elements are used to hack with pointer events in the drag-and-drop API
      // and they are also used to separate the prepend and append reveal values
      // from the other droppable content
      if (replace) {
        replaceWrap = '<span>' + replace + '</span>';
      } else {
        replaceWrap = this.origDropContents[dropId];
      }
      if (append) {
        appendWrap = '<span class="small drop-reveal"> [' + append + ']</span>';
      }
      if (prepend) {
        prependWrap = '<span class="small drop-reveal">[' + prepend + '] </span>';
      }
      
      droppableElem.html(prependWrap + replaceWrap + appendWrap);
    },
    
    detachDragEventHandlers: function() {
      this.element.find(this.settings.droppable_selector)
        .off('dragover dragenter dragleave drag');
      this.draggablesContainer.find(this.settings.draggable_selector)
        .off('dragstart dragend')
        .attr('draggable', 'false')
        .addClass('finished');
    },
    
    addFinalPointsString: function(pointsElem, scorePercentage) {
      // string to format, fill in score
      var finalPointsStr = pointsElem.attr(this.settings.final_points_msg_attr);
      finalPointsStr = finalPointsStr.replace('{score}', scorePercentage.toString());
      // prepend the final score HTML to the points element
      pointsElem.prepend(finalPointsStr);
    },
    
    setInfoPosition: function() {
      if ($(window).height() * 0.8 > this.contentDiv.height()) {
        // exercise content fits easily in the window
        // use normal positioning for the info box
        this.infoDiv.removeClass('fixed');
        this.contentDiv.removeClass('fixed-info');
        this.infoDiv.css('maxHeight', ''); // remove css property
        this.contentDiv.css('marginBottom', '');
      } else {
        // exercise content takes most space in the window or does not fit in:
        // use fixed positioning for the info box to keep it visible on the screen
        this.infoDiv.addClass('fixed');
        this.contentDiv.addClass('fixed-info');
        var h = $(window).height() * 0.25;
        this.infoDiv.css('maxHeight', h);
        this.contentDiv.css('marginBottom', h);
      }
    },
    
    setDraggablesPosition: function() {
      // make the draggables container fixed if it cannot be seen: the window is too small
      // to fit everything on the screen at once
      
      if ($(window).height() * 0.8 > this.contentDiv.height()) {
        // exercise content fits easily in the window
        // use normal positioning for the draggables container
        this.draggablesContainer.removeClass('fixed');
        this.contentDiv.removeClass('fixed-draggables');
        this.draggablesContainer.css('maxHeight', $(window).height() * 0.25);
        // max height prevents the draggables container from becoming massive if there are many draggables
        this.contentDiv.css('marginTop', ''); // remove css property
      } else {
        // exercise content takes most space in the window or does not fit in:
        // use fixed positioning for the draggables container to keep it visible on the screen
        this.draggablesContainer.addClass('fixed');
        this.contentDiv.addClass('fixed-draggables');
        this.draggablesContainer.css('maxHeight', ''); // remove maxHeight to measure real height
        var h = Math.min(this.draggablesContainer.height(), $(window).height() * 0.25);
        this.draggablesContainer.css('maxHeight', h);
        this.contentDiv.css('marginTop', h);
      }
    },
    
    buildFinalFeedback: function() {
      // let the server backend create the HTML of the final feedback
      // only upload the submission data here (what the student answered in each droppable)
      // if the frontend JS could post feedback HTML to the server, a malicious user could
      // inject scripts that create XSS vulnerabilities in the frontend learning management system
      return {
        answers: this.questionAnswered,
        correctAnswers: this.correctAnswers,
        incorrectAnswers: this.incorrectAnswers,
      };
    },
  
  });
  
  // attach a method to jQuery objects that initializes drag-and-drop exercise
  // in the elements matched by the jQuery object
  $.fn[pluginName] = function(options) {
    return this.each(function() {
      if (!$.data(this, "plugin_" + pluginName)) {
        $.data(this, "plugin_" + pluginName, new AcosDragAndDrop(this, options));
      }
    });
  };
})(jQuery, window, document);

jQuery(function() {
  jQuery('.draganddrop').acosDragAndDrop();
});
