import 'libs/polyfills'
import $ from 'jquery'
import lodash from 'lodash'

class Translator {
  constructor () {
    this.translations = []
    this.parseAst = this.parseAst.bind(this)
    this.observing = true
  }
  
  parseAst (ast) {
    if (ast.type === 'compound') {
      return [lodash.flatten(ast.list.map(this.parseAst)).join('')]
    } else if (ast.type === 'complex') {
      return lodash.flatten([this.parseAst(ast.left), this.parseAst(ast.right)])
    } else {
      return [ast.content]
    }
  }
  
  addTranslations (translations) {
    for (const pattern in translations) {
      const translation = translations[pattern]
      this.translations.push({
        pattern: pattern, translation: typeof translation === 'string' ? setHtml(translation) : translation,
      })
    }
    return this
  }
  
  getMatch ({ node, pattern }) {
    let parents, descendants
    if ((descendants = $(pattern, node)).length > 0) {
      return descendants
    } else if (node.is(pattern)) {
      return node
    } else if ((parents = node.parents(pattern)).length > 0) {
      return parents
    }
  }
  
  processNode (node) {
    for (const { translation, ...rest } of this.translations) {
      const found = this.getMatch({ node: $(node), ...rest })
      
      if (found && found.length > 0) {
        this.observing = false
        translation(found)
        setTimeout(() => {
          this.observing = true
        })
      }
    }
  }
  
  run () {
    this.processNode(document.body)
    
    const observer = new MutationObserver((mutations) => {
      if (this.observing) {
        for (const mutation of mutations) {
          if (mutation.type === 'childList') {
            for (let added of mutation.addedNodes) {
              if (added.nodeType === Node.ELEMENT_NODE) {
                this.processNode(added)
              }
            }
          } else if (mutation.type === 'attributes') {
            this.processNode(mutation.target)
          }
        }
      }
    })
    
    observer.observe(document.body, {
      // Tweak what you're looking for depending on what change you want to find.
      childList: true, subtree: true, attributes: true,
    })
    
    return function () {
      observer.disconnect()
    }
  }
}

function setHtml (html) {
  return function (e) {e.html(html) }
}

function setAttr (attr, value) {
  return function (e) {e.attr(attr, value) }
}

function setTitle (title) {
  return setAttr('title', title)
}

function escapeRegex (string) {
  return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
}

function replaceText (from, to) {
  return setEach(function (e) {
    Array.from($(e).find(':not(iframe)').addBack().contents().filter(function () {
      return this.nodeType === Node.TEXT_NODE
    })).reduce(function (ax, b) {
      let previousItem
      if (ax.length > 0 && b.previousSibling === (previousItem = ax[ax.length - 1])) {
        previousItem.textContent = previousItem.textContent + b.textContent
        $(b).remove()
        return ax
      } else {
        return ax.concat(b)
      }
    }, []).forEach(function (item) {
      item.textContent = item.textContent.replace(from instanceof RegExp ? from : new RegExp(escapeRegex(from), 'ig'), to)
    })
  })
}

function chain (...fns) {
  return function (e) {
    for (const f of fns) {
      f(e)
    }
  }
}

function setEach (f) {
  return function (e) {
    $.each(e, function (i, e) {
      f($(e))
    })
  }
}

function setCss (css) {
  return function (e) {
    e.css(css)
  }
}

function noOp () {}

const translator = new Translator()

translator.addTranslations({
  '[data-aid="navTab-stories"]': '故事',
  '[data-aid="navTab-analytics"]': '分析',
  '[data-aid="navTab-members"]': '成员',
  '[data-aid="navTab-integrations"]': '集成',
  '[data-aid="navTab-more"]': '更多',
  'span[class$="projectNavCollapsed__trayButtonLabel"]': '故事',
  '.panel.current_backlog [data-aid="PanelHeader__name"], .MuiListItem-root[title="Current/backlog"] .panel_name span': '当前迭代/积压',
  '.panel.current [data-aid="PanelHeader__name"], .MuiListItem-root[title="Current iteration"] .panel_name span': '当前迭代',
  '.panel .accepted_stories_bar label': replaceText('accepted stories', '个已接受的故事'),
  '.panel .accepted_stories_bar label.show': chain(replaceText('Show', '显示'), replaceText('隐藏', '显示')),
  '.panel .accepted_stories_bar label.hide': chain(replaceText('Hide', '隐藏'), replaceText('显示', '隐藏')),
  '.panel.backlog:not(.current_backlog) [data-aid="PanelHeader__name"], .MuiListItem-root[title="Backlog"] .panel_name span': '积压',
  '.panel.done [data-aid="PanelHeader__name"], .MuiListItem-root.done .panel_name span': '已完成',
  '.panel.icebox [data-aid="PanelHeader__name"], .MuiListItem-root.icebox .panel_name span': '冰箱',
  '.panel.epics [data-aid="PanelHeader__name"], .MuiListItem-root.epics .panel_name span': '壮举',
  '.panel.epics .empty_message.epics .empty_message_text': '具有多个故事的总体计划放在这里。',
  '.panel.my_work [data-aid="PanelHeader__name"], .MuiListItem-root.my_work .panel_name span': '我的任务',
  '.panel.blockers [data-aid="PanelHeader__name"], .MuiListItem-root.blockers .panel_name span': '被阻碍',
  '.panel[data-type="labels"]  [data-aid="PanelHeader__name"], .MuiListItem-root.labels .panel_name span': '标签',
  '.panel.project_history [data-aid="PanelHeader__name"], .MuiListItem-root.project_history .panel_name span': '项目历史',
  '.panel [data-aid="AddButton"] span.MuiButton-label': '<span class="MuiButton-startIcon MuiButton-iconSizeMedium"><svg class="MuiSvgIcon-root" focusable="false" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"></path></svg></span>添加故事',
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
  'span[class^="IterationMarker__points___"] span:eq(0)': replaceText('of', '/'),
  '.search_bar_container input[name="search"]': setAttr('placeholder', '搜索项目'),
  'button.toggle_sidebar': setTitle('切换侧边栏'),
  '[data-aid="StoryDetailsEdit"] button.std.close': '收起',
  '[data-aid="StoryDetailsEdit"] button.clipboard_button.link': setTitle('复制故事链接'),
  '[data-aid="StoryDetailsEdit"] button.clipboard_button.id': setTitle('复制故事ID'),
  '[data-aid="StoryDetailsEdit"] button.clone_story': setTitle('克隆故事'),
  '[data-aid="StoryDetailsEdit"] button.history': setTitle('故事历史'),
  '[data-aid="StoryDetailsEdit"] button.delete': setTitle('删除故事'),
  '[data-aid="StoryDetailsEdit"] [data-aid="StoryState"]': chain(replaceText('Unstarted', '未开始'), replaceText('Started', '已开始'), replaceText('Finished', '已结束'),
    replaceText('Delivered', '已发布'), replaceText('Accepted', '被接受'), replaceText('Rejected', '被拒绝'), replaceText('Accept', '接受'), replaceText('Reject', '拒绝'),
  ),
  '[data-aid="StoryPreviewItem__preview"] .state, [data-aid="StoryDetailsEdit"] .state': chain(replaceText('State', '状态'), replaceText('Start', '开始'),
    replaceText('Finish', '结束'), replaceText('Accept', '接受'), replaceText('Reject', '拒绝'),
  ),
  '[data-aid="StoryState__dropdown--label"]': chain(replaceText('Accepted', '接受'), replaceText(' on ', '于')),
  '[data-aid="Reviews"] [class^="ReviewEdit__reviewer"]': setCss({ flex: '0 1 50px' }),
  '[data-aid="Reviews"]': chain(replaceText('Reviewer', '审查员'), replaceText('Select review type', '选择审查类型'), replaceText('Manage review types', '管理审查类型'),
    replaceText('Select status', '选择状态'), replaceText('Unstarted', '未开始'), replaceText('In review', '审查中'), replaceText('Pass', '通过'),
    replaceText('Revise', '需修订'), replaceText('Reviews', '审查'), replaceText('Review', '审查'), replaceText('add ', '添加'), replaceText('Delete ', '删除'),
  ),
  '.MuiList-root[class*="SidebarFooter__"], .MuiPopover-paper': chain(replaceText('Display:', '展示:'), replaceText('Normal', '正常'), replaceText('Dense', '紧凑'),
    replaceText('Projector', '投屏'),
  ),
  '.story.info_box .info .type': chain(replaceText('Story Type', '故事类型'), replaceText('chore', '杂项'), replaceText('feature', '功能'), replaceText('bug', '缺陷'),
    replaceText('release', '版本'),
  ),
  '.story.info_box .info .priority': chain(replaceText('Priority', '优先级'), replaceText('critical', '紧要'), replaceText('high', '高'), replaceText('medium', '中'),
    replaceText('low', '低'), replaceText('none', '无'),
  ),
  '.story.info_box .info .estimate .dropdown_menu': chain(replaceText('Points', '点'), replaceText('Point', '点')),
  '.story.info_box .info .estimate': chain(replaceText('Points', '点数'), replaceText('unestimated', '未预估')),
  '.story.info_box .info .requester': chain(replaceText('Requester', '请求者')),
  '.story.info_box .owner': chain(replaceText('Owners', '负责人'), replaceText('none', '无')),
  '.story.info_box .following': chain(replaceText('Follow this story', '关注该故事'), replaceText(/ followers?/i, '个关注者')),
  '.followers_flyover ': chain(replaceText('People following this story', '对该故事关注的人')),
  '.story.info_box .timestamp': chain(replaceText('Updated: ', '更新与'), replaceText('Requested: ', '请求与'), replaceText(' Ago', '前'),
    replaceText('Minutes', '分钟'), replaceText('Seconds', '秒'),
  ),
  '[data-aid="StoryDetailsEdit"] [data-aid="Blockers"]': chain(replaceText('Blockers', '阻碍'), replaceText('Add blocker or impediment', '添加阻碍')),
  '[data-aid="StoryDetailsEdit"] [data-aid="Blockers"] [data-aid="Blocker__textarea"]': setAttr('placeholder', '阻碍原因 例: @用户 或 故事ID#'),
  '[data-aid="StoryDetailsEdit"] [data-aid="Blockers"] [data-aid="BlockerEdit"]': chain(replaceText('Add', '添加'), replaceText('Cancel', '取消')),
  '[data-aid="StoryDetailsEdit"] [data-aid="Description"] > h4': replaceText('Description', '描述'),
  '[data-aid="StoryDetailsEdit"] [data-aid="Description"] [class^="DescriptionEdit__tab"]': chain(replaceText('Write', '编写'), replaceText('Preview', '预览')),
  '[data-aid="StoryDetailsEdit"] [data-aid="Description"] [class*="DescriptionShow__placeholder"]': chain(replaceText('Add a description', '添加描述')),
  
})

translator.run()
