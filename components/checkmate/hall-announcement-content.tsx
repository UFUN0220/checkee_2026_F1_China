import styles from './checkmate-experience.module.css'

const STATISTICS_UPDATED_AT = '2026.09.14'

function formatUpdateDate(value: string) {
  return value.replaceAll('-', '.')
}

export function HallAnnouncementContent({
  caseCount,
  hallUpdatedAt,
  guideTitleId = 'hall-welcome-guide-title',
}: {
  caseCount: number
  hallUpdatedAt: string
  guideTitleId?: string
}) {
  return (
    <>
      <div className={styles.hallWelcomeIntro}>
        <p>关于名人堂与统计看板的数据来源、更新时间与使用说明。</p>
      </div>

      <div className={styles.hallWelcomeSections}>
        <section className={styles.hallWelcomeSection}>
          <h2>数据范围</h2>
          <p>“名人堂”主要收录42天（6周）以上 F-1 案例。</p>
          <p>long refused专业主要集中在CS,ECE,EE,BME,MSE,ChemE,ME,Phy,Bio...</p>
        </section>

        <section className={styles.hallWelcomeSection}>
          <h2>数据来源</h2>
          <p>“名人堂”数据来自身边朋友、同学、群友、网友贡献，感谢大家分享与贡献！</p>
          <p>“统计”数据来自checkee.info上F-1类数据整理。</p>
        </section>

        <section className={styles.hallWelcomeSection}>
          <h2>统计口径</h2>
          <p>笔者已defer，同为lr受害者，希望整理的信息帮到大家。</p>
          <p>
            由于Checkee统计与手工收集tl数据方式的局限性，部分案例会有不可避免的偏差，如后续状态改变，而原数据上传者未更新信息。
          </p>
          <p>因此“统计”面板指标为 中位数 与 上下四分位数。</p>
          <p>
            笔者认为，虽然有未更新的案例导致整体时间偏长，但进入long refused状态且知晓checkee等网站，愿意分享长tl的朋友，本身就是整体等待天数时间偏长的一小部分，因此中位数或许还是较为准确的参考。实际受其他因素影响可能偏左或偏右，由个人判断。
          </p>
        </section>

        <section className={styles.hallWelcomeSection}>
          <h2>隐私与说明</h2>
          <p>本网站不披露个人信息，仅为统计使用。如有数据伦理问题请联系开发者，可修改或撤下数据。</p>
          <p>本项目长期维护，更新周期最长为2天。Github已开源：</p>
          <p className={styles.hallWelcomeLink}>https://github.com/UFUN0220/checkee_2026_F1_China</p>
          <p>笔者联系方式：qq:1724793685，闲聊交友也都可加微信。</p>
        </section>
      </div>

      <p className={styles.hallWelcomeUpdateNotice}>统计与名人堂采用独立的数据更新流程，更新时间可能存在差异。</p>

      <div className={styles.hallWelcomeStats} aria-label="名人堂数据概览">
        <div>
          <span>当前案例</span>
          <strong>{caseCount}</strong>
        </div>
        <div>
          <span>名人堂更新</span>
          <strong>{formatUpdateDate(hallUpdatedAt)}</strong>
        </div>
        <div>
          <span>统计更新</span>
          <strong>{STATISTICS_UPDATED_AT}</strong>
        </div>
      </div>

      <section className={styles.hallWelcomeGuide} aria-labelledby={guideTitleId}>
        <h2 id={guideTitleId}>你可以</h2>
        <ul>
          <li>
            <strong>查看案例</strong>
            <span>浏览不同地点、学位与等待时长的真实记录。</span>
          </li>
          <li>
            <strong>提交案例</strong>
            <span>分享你的时间线，帮助后来的人了解情况。</span>
          </li>
          <li>
            <strong>修改/说明</strong>
            <span>发现错误或遗漏时，欢迎反馈给我们。</span>
          </li>
        </ul>
      </section>
    </>
  )
}
