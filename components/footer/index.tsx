import { clsx } from 'clsx'
import { Container } from '~/components/ui/container'
import { FooterYvon } from './footer-yvon'

export function Footer() {
  return (
    <Container as="footer" className="mb-16 mt-8 md:mt-16">
      <div
        className={clsx([
          'grid grid-cols-1 gap-x-8 gap-y-8 py-4 md:grid-cols-2 xl:grid-cols-3',
          'border-t border-gray-200 lg:-ml-[5%] lg:w-[110%] dark:border-gray-700',
        ])}
      ></div>
      <FooterYvon />
    </Container>
  )
}
{
  /* <div className="col-span-1 space-y-4 xl:col-span-2"> 插在18行
          <LogoAndRepo />
          <h3 className="text-lg font-serif lg:-ml-4">© 2025 UFUN. Relax, Learn, Create.</h3>
          <div className="text-sans text-gray-300 font-bold">{SITE_METADATA.description}</div>
          <div className="pt-4">
            <div className="flex gap-8 py-1.5 md:gap-20">
              <FooterMeta /> 
            </div>
          </div>
        </div> */
}
{
  /* <FooterNav />  */
}
