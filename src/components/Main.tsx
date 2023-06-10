import type { ReactElement } from 'react'
import { useEffect, useState } from 'react'
import { Action, ActionPanel, Icon, List, Toast, showToast } from '@raycast/api'
import { usePromise } from '@raycast/utils'
import type { LanguageCode } from '../data/languages'
import { getLanguageName, languages, languagesByCode } from '../data/languages'
import { translateAll } from '../logic/translator'
import { targetLanguages, useDebouncedValue, useSystemSelection } from '../logic/hooks'
import { unicodeTransform } from '../logic/text'
import { spellcheck } from '../logic/spellcheck'
import { SpellcheckItem } from './SpellcheckItem'
import { TranslateDetail } from './TranslateDetail'

const langReg = new RegExp(`[>:/](${Object.keys(languagesByCode).join('|')})$`, 'i')

export function Main(): ReactElement {
  const langs = targetLanguages
  const [isShowingDetail, setIsShowingDetail] = useState(true)
  const [input, setInput] = useState('')
  const [systemSelection] = useSystemSelection()
  const [selectedId, setSelectedId] = useState<string>()

  const [userLangFrom, setUserLangFrom] = useState<LanguageCode>()
  const [langFrom, setLangFrom] = useState<LanguageCode>('auto')

  const rawSourceText = (input.trim() || systemSelection)
  const sourceText = rawSourceText
    .replace(langReg, (_, lang) => {
      const _lang = lang.toLowerCase()
      if (_lang !== langFrom)
        setLangFrom(_lang)
      return ''
    })
    .trim()

  if (rawSourceText === sourceText && langFrom !== 'auto')
    setLangFrom('auto')

  const debouncedText = useDebouncedValue(sourceText, 500)

  const { data: results, isLoading } = usePromise(translateAll, [debouncedText, langFrom, langs], {
    onError(error) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Could not translate',
        message: error.toString(),
      })
    },
  })
  const { data: correctedText } = usePromise(spellcheck, [debouncedText])

  // reset selection when results change
  useEffect(() => {
    setSelectedId(undefined)
  }, [results])

  const fromLangs = Array.from(new Set(results?.map(i => i.from)))
  const singleSource = fromLangs.length === 1

  return (
    <List
      searchBarPlaceholder={systemSelection || 'Enter text to translate'}
      searchBarAccessory={
        <List.Dropdown
          tooltip='Source language'
          value={userLangFrom ?? langFrom}
          onChange={(v) => {
            if (v === 'auto')
              setUserLangFrom(undefined)
            else
              setUserLangFrom(v as LanguageCode)
          }}
        >
          <List.Dropdown.Item
            key='auto'
            title={singleSource ? `Auto (${getLanguageName(fromLangs[0])})` : 'Auto'}
            value='auto'
            />
          <List.Dropdown.Section>
            {targetLanguages.map(lang => (
              <List.Dropdown.Item
                key={lang}
                title={getLanguageName(lang)}
                value={lang}
              />
            ))}
          </List.Dropdown.Section>
          <List.Dropdown.Section>
            {Object.values(languages)
              .filter(lang => lang.code !== 'auto' && !targetLanguages.includes(lang.code))
              .map(lang => (
                <List.Dropdown.Item
                  key={lang.code}
                  title={lang.name}
                  value={lang.code}
              />))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
      searchText={input}
      onSearchTextChange={setInput}
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      throttle
      selectedItemId={selectedId}
      onSelectionChange={(item) => {
        setSelectedId(item ?? undefined)
      }}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open GitHub"
            url="https://github.com/antfu/raycast-multi-translate"
            icon={Icon.Code}
          />
        </ActionPanel>
      }
    >
      {correctedText ? <SpellcheckItem text={sourceText} corrected={correctedText} /> : null}
      {results?.map((item, index) => {
        return (
          <List.Item
            key={index}
            id={item.to}
            title={item.translated}
            accessories={[{
              text: singleSource
                ? unicodeTransform(item.to.toUpperCase(), 'small_caps')
                : `${unicodeTransform(item.from.toUpperCase(), 'small_caps')} -> ${unicodeTransform(item.to.toUpperCase(), 'small_caps')}`,
            }]}
            detail={<TranslateDetail item={item} />}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.CopyToClipboard title="Copy" content={item.translated} />
                  <Action title="Toggle Full Text" icon={Icon.Text} onAction={() => setIsShowingDetail(!isShowingDetail)} />
                  <Action.OpenInBrowser
                    title="Open in Google Translate"
                    shortcut={{ modifiers: ['opt'], key: 'enter' }}
                    url={`https://translate.google.com/?sl=${item.from}&tl=${item.to}&text=${encodeURIComponent(item.original)}&op=translate`}
                  />
                  <Action.OpenInBrowser
                    title="Open in Google Search"
                    url={`https://google.com/?s=${encodeURIComponent(item.original)}`}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        )
      })}
    </List>
  )
}
