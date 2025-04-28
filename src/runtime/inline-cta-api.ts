import {ASSETS} from '../constants';
import {ActivityIframeView} from '../ui/activity-iframe-view';
import {ActivityPorts} from '../components/activities';
import {Deps} from './deps';
import {Doc} from '../model/doc';
import {Intervention} from './intervention';
import {ProductType} from '../api/subscriptions';
import {createElement} from '../utils/dom';
import {feArgs, feUrl} from './services';
import {parseUrl} from '../utils/url';
import {setImportantStyles} from '../utils/style';

const INLINE_CTA_ATTRIUBUTE_QUERY = 'div[rrm-inline-cta]';
const INLINE_CTA_ATTRIUBUTE = 'rrm-inline-cta';
const DEFAULT_PRODUCT_TYPE = ProductType.UI_CONTRIBUTION;

export class InlincCtaApi {
  private readonly doc_: Doc;
  private readonly win_: Window;
  private readonly activityPorts_: ActivityPorts;

  constructor(private readonly deps_: Deps) {
    this.doc_ = deps_.doc();
    this.win_ = deps_.win();
    this.activityPorts_ = deps_.activities();
  }

  actionToIframeMapping: {[key: string]: string} = {
    TYPE_REGISTRATION_WALL: '/regwalliframe',
    TYPE_NEWSLETTER_SIGNUP: '/newsletteriframe',
    TYPE_REWARDED_SURVEY: '/surveyiframe',
    TYPE_BYO_CTA: '/byoctaiframe',
    TYPE_CONTRIBUTION: '/contributionoffersiframe',
  };

  init() {
    const head = this.doc_.getHead();
    if (!head) {
      return;
    }

    const url = `${ASSETS}/swg-inline-cta.css`;
    const existing = head.querySelector(`link[href="${url}"]`);
    if (existing) {
      return;
    }

    // <link rel="stylesheet" href="..." type="text/css">
    head.appendChild(
      createElement(this.doc_.getWin().document, 'link', {
        'rel': 'stylesheet',
        'type': 'text/css',
        'href': url,
      })
    );
  }

  actionToUrlPrefix(
    configId: string | null,
    actions: Intervention[] = []
  ): string {
    if (!configId || actions.length <= 0) {
      return '';
    }
    for (const action of actions) {
      if (action.configurationId === configId) {
        return this.actionToIframeMapping[action.type];
      }
    }
    return '';
  }

  async attachInlineCtaWithAttribute(
    div: HTMLElement,
    actions: Intervention[] = []
  ) {
    const configId = div.getAttribute(INLINE_CTA_ATTRIUBUTE);
    const urlPrefix = this.actionToUrlPrefix(configId, actions);
    if (!urlPrefix) {
      return;
    }
    const iframeParams: {[key: string]: string} =
      urlPrefix === '/contributionoffersiframe'
        ? {
            // 'productId': this.deps_.pageConfig().getProductId() || '',
            'publicationId': 'CAow37yEAQ',
            'isClosable': 'true',
            'isAccessibleForFree': 'true',
          }
        : {
            'origin': parseUrl(this.win_.location.href).origin,
            'configurationId': configId || '',
            'isClosable': 'false',
            'calledManually': 'true',
            'previewEnabled': 'false',
            'publicationId': this.deps_.pageConfig().getPublicationId(),
          };
    const activityIframeView = new ActivityIframeView(
      this.win_,
      this.activityPorts_,
      feUrl(urlPrefix, iframeParams),
      feArgs({
        'supportsEventManager': true,
        'productType': DEFAULT_PRODUCT_TYPE,
        'windowHeight': this.win_./* OK */ innerHeight,
      }),
      /* shouldFadeBody */ true
    );
    setImportantStyles(activityIframeView.getElement(), {
      'height': '100%',
      'width': '100%',
    });

    div.appendChild(activityIframeView.getElement());

    const port = await this.activityPorts_.openIframe(
      activityIframeView.getElement(),
      feUrl(urlPrefix, iframeParams),
      feArgs({
        'supportsEventManager': true,
        'productType': DEFAULT_PRODUCT_TYPE,
        'windowHeight': this.win_./* OK */ innerHeight,
      })
    );
    await port.whenReady();
  }

  attachInlineCtasWithAttribute(actions: Intervention[] = []) {
    const elements: HTMLElement[] = Array.from(
      this.doc_.getWin().document.querySelectorAll(INLINE_CTA_ATTRIUBUTE_QUERY)
    );
    for (const element of elements) {
      this.attachInlineCtaWithAttribute(element, actions);
    }
  }
}
