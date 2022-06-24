import 'libs/polyfills';
import $ from 'jquery';
import lodash from 'lodash';
import * as parsel from 'parsel-js/parsel';

class Translator {
  constructor() {
    this.translations = [];
    this.parseAst = this.parseAst.bind(this);
    this.observing = true;
  }
  
  parseAst(ast) {
    if (ast.type === 'compound') {
      return [lodash.flatten(ast.list.map(this.parseAst)).join('')];
    } else if (ast.type === 'complex') {
      return lodash.flatten(
          [this.parseAst(ast.left), this.parseAst(ast.right)]);
    } else {
      return [ast.content];
    }
  }
  
  parsePattern(pattern) {
    const ast = parsel.parse(pattern, {recusive: false, list: false});
    return this.parseAst(ast);
  }
  
  addTranslations(translations) {
    for (const pattern in translations) {
      const translation = translations[pattern];
      this.translations.push({
        pattern: pattern,
        parsedPattern: this.parsePattern(pattern),
        translation: typeof translation === 'string'
            ? setHtml(translation)
            : translation,
      });
    }
    return this;
  }
  
  getMatch({node, pattern, parsedPattern}) {
    const descendants = $(pattern, node);
    if (descendants.length > 0) {
      return descendants;
    } else if (node.is(pattern)) {
      return node;
    }
  }
  
  processNode(node) {
    for (const {translation, ...rest} of this.translations) {
      const found = this.getMatch({node: $(node), ...rest});
      
      if (found && found.length > 0) {
        this.observing = false;
        translation(found);
        setTimeout(() => {
          this.observing = true;
        });
      }
    }
  }
  
  run() {
    this.processNode(document.body);
    
    const observer = new MutationObserver((mutations) => {
          if (this.observing) {
            for (const mutation of mutations) {
              if (mutation.type === 'childList') {
                for (let added of mutation.addedNodes) {
                  if (added.nodeType === Node.ELEMENT_NODE) {
                    this.processNode(added);
                  }
                }
              } else if (mutation.type === 'attributes') {
                console.log(mutation);
                this.processNode(mutation.target);
              }
            }
          }
        },
    );
    
    observer.observe(document.body, {
      // Tweak what you're looking for depending on what change you want to find.
      childList: true,
      subtree: true,
      attributes: true,
    });
    
    return function() {
      observer.disconnect();
    };
  }
}

function

setHtml(html) {
  return function(e) {e.html(html); };
}

function

setAttr(attr, value) {
  return function(e) {e.attr(attr, value); };
}

function

setTitle(title) {
  return setAttr('title', title);
}

function

replaceText(from, to) {
  return setEach(function(e) {
    e.text(e.text().replace(from, to));
  });
}

function

chain(...fns) {
  return function(e) {
    for (const f of fns) {
      f(e);
    }
  };
}

function

setEach(f) {
  return function(e) {
    $.each(e, function(i, e) {
      f($(e));
    });
  };
}

function

noOp() {}

const
    translator = new Translator();

translator.addTranslations({
      '[data-aid="navTab-stories"]':
          '故事',
      '[data-aid="navTab-analytics"]':
          '分析',
      '[data-aid="navTab-members"]':
          '成员',
      '[data-aid="navTab-integrations"]':
          '集成',
      '[data-aid="navTab-more"]':
          '更多',
      'span[class$="projectNavCollapsed__trayButtonLabel"]':
          '故事',
      '.panel.current_backlog [data-aid="PanelHeader__name"], .MuiListItem-root[title="Current/backlog"] .panel_name span':
          '当前迭代/积压',
      '.panel.current [data-aid="PanelHeader__name"], .MuiListItem-root[title="Current iteration"] .panel_name span':
          '当前迭代',
      '.panel .accepted_stories_bar label': replaceText('accepted stories',
          '个已接受的故事',
      ),
      '.panel .accepted_stories_bar label.show': chain(replaceText('Show', '显示'),
          replaceText('隐藏', '显示'),
      ),
      '.panel .accepted_stories_bar label.hide': chain(replaceText('Hide', '隐藏'),
          replaceText('显示', '隐藏'),
      ),
      '.panel.backlog:not(.current_backlog) [data-aid="PanelHeader__name"], .MuiListItem-root[title="Backlog"] .panel_name span':
          '积压'
      ,
      '.panel.done [data-aid="PanelHeader__name"], .MuiListItem-root.done .panel_name span':
          '已完成'
      ,
      '.panel.icebox [data-aid="PanelHeader__name"], .MuiListItem-root.icebox .panel_name span':
          '冰箱'
      ,
      '.panel.epics [data-aid="PanelHeader__name"], .MuiListItem-root.epics .panel_name span':
          '壮举'
      ,
      '.panel.epics .empty_message.epics .empty_message_text': '具有多个故事的总体计划放在这里。'
      ,
      '.panel.my_work [data-aid="PanelHeader__name"], .MuiListItem-root.my_work .panel_name span':
          '我的任务'
      ,
      '.panel.blockers [data-aid="PanelHeader__name"], .MuiListItem-root.blockers .panel_name span':
          '被阻碍'
      ,
      '.panel[data-type="labels"]  [data-aid="PanelHeader__name"], .MuiListItem-root.labels .panel_name span':
          '标签'
      ,
      '.panel.project_history [data-aid="PanelHeader__name"], .MuiListItem-root.project_history .panel_name span':
          '项目历史'
      ,
      '.panel [data-aid="AddButton"] span.MuiButton-label':
          '<span class="MuiButton-startIcon MuiButton-iconSizeMedium"><svg class="MuiSvgIcon-root" focusable="false" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"></path></svg></span>添加故事'
      ,
      '[data-aid="SelectAll"] span': '全选',
      '[data-aid="DeselectAll"] span': '取消全选',
      '[data-aid="ClonePanel"] span': '克隆面版',
      '[data-aid="ExpandAllIterations"] span': '展开所有迭代',
      '[data-aid="CollapseAllIterations"] span': '收起所有迭代',
      'span[data-aid=\'DropdownMenuOption__text\']:contains(\'Hide empty iterations\')': '隐藏空迭代',
      '[data-aid="Split Current & Backlog"] span': '拆封当前和积压',
      '[data-aid="Combine Current & Backlog"] span': '合并当前和积压',
      '[data-aid="AddToBottom"] span': '添加故事到面板底部',
      'span[data-aid="CloseButton"]': setTitle('关闭面板'),
      'span[data-aid="IterationMarker__pointsTotal"]': replaceText('points', '点'),
      'span[class^="IterationMarker__points___"] span:eq(0)': replaceText('of',
          '/',
      ),
      '.search_bar_container input[name="search"]': setAttr('placeholder', '搜索项目'),
      'button.toggle_sidebar': setTitle('切换侧边栏'),
      '[data-aid="StoryDetailsEdit"] button.std.close': '收起',
      '[data-aid="StoryDetailsEdit"] button.clipboard_button.link': setTitle(
          '复制故事链接'),
      '[data-aid="StoryDetailsEdit"] button.clipboard_button.id': setTitle(
          '复制故事ID'),
      '[data-aid="StoryDetailsEdit"] button.clone_story': setTitle('克隆故事'),
      '[data-aid="StoryDetailsEdit"] button.history': setTitle('故事历史'),
      '[data-aid="StoryDetailsEdit"] button.delete': setTitle('删除故事'),
      '[data-aid="StoryDetailsEdit"] [data-aid="StoryState"] em': '状态',
      '[data-aid="StoryDetailsEdit"] [data-aid="StoryState"] .state.button.finish': '结束',
      '[data-aid="StoryDetailsEdit"] [data-aid="StoryState"] [data-aid="StoryState__dropdown"] [data-aid="StoryState__dropdown--label"]': chain(
          replaceText('Started', '已开始')),
      '[data-aid="StoryDetailsEdit"] [data-aid="StoryState"] [data-aid="StoryState__dropdown"] .Dropdown__options [data-aid="Unstarted"]': '未开始',
      '[data-aid="StoryDetailsEdit"] [data-aid="StoryState"] [data-aid="StoryState__dropdown"] .Dropdown__options [data-aid="Started"]': '已开始',
      '[data-aid="StoryDetailsEdit"] [data-aid="StoryState"] [data-aid="StoryState__dropdown"] .Dropdown__options [data-aid="Accepted"]': '已接受'
    },
);

translator.run();
