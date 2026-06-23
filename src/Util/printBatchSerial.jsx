import { Modal } from 'antd'
import { parseAmount, textToBase64Barcode } from './Util'

const printBatchSerial = ({ items, name = 'batchSerials', companyInfo }) => {
  Modal.info({
    width: 400,
    icon: null,
    okText: 'Print',
    onOk: () => {
      let width = '2in'
      let height = '1in'

      if (['636f9698bbe149003186619a'].includes(companyInfo._id)) {
        width = '1.5in'
        height = '1in'
      }

      const content = document.getElementById('print-batch-serial')
      const pri = document.getElementById('batch-serial-iframe').contentWindow
      pri.document.open()
      pri.document.write(
        `<html>
          <head>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&display=swap');
              @page {
                size: ${width} ${height};
                margin: 0;
              }
              
              body {
                margin: 0;
                font-family: Roboto, sans-serif;
                font-weight: 400;
              }
              
              .print-border {
                height: ${height};
              }

              img {
                width: 90% !important;
                height: 30px !important;
              }

              h4 {
                font-size: 12px;
              }
              
              h5 {
                font-size: 8px;
              }

              ${
                ['636f9698bbe149003186619a'].includes(companyInfo._id)
                  ? `
                    img {
                      width: 90% !important;
                      height: 20px !important;
                    }
                    
                    h4 {
                      font-size: 14px;
                    }
                  
                    h5 {
                      font-size: 10px;
                    }
                  `
                  : ''
              }
            </style>
          </head>
          ${content.innerHTML}

        </html>`
      )
      pri.document.close()
      pri.focus()
      setTimeout(() => {
        pri.print()
      }, 200)
    },
    okCancel: true,
    content: (
      <div>
        <div id="print-batch-serial">
          {items.map((item, i1) =>
            item?.[name]?.map((batchSerial, i2) =>
              [...Array(batchSerial.quantity)].map((__, i) => (
                <div
                  key={`${i1}-${i2}-${i}`}
                  className="print-border"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    pageBreakInside: 'avoid'
                  }}>
                  {['636f9698bbe149003186619a'].includes(companyInfo._id) ? (
                    <table width="100%">
                      <tbody>
                        <tr>
                          <td align="center">
                            <h4 style={{ margin: 0 }}>{companyInfo?.name}</h4>
                          </td>
                        </tr>
                        <tr>
                          <td align="center">
                            <img
                              alt=""
                              src={textToBase64Barcode(batchSerial.serialNo || batchSerial.batchNo, {
                                width: 5,
                                height: 80,
                                margin: 0,
                                displayValue: true,
                                fontSize: 40,
                                font: 'Roboto, sans-serif',
                                fontOptions: 'bold'
                              })}
                              style={{
                                objectFit: 'contain'
                              }}
                              width="100%"
                            />
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <h5 style={{ margin: 0 }}>{item.materialDescription}</h5>
                          </td>
                        </tr>
                        <tr>
                          <td align="center">
                            <h4 style={{ margin: 0 }}>
                              {`${companyInfo?.currency} : ${parseAmount(
                                item.printPrice,
                                companyInfo?.currency
                              )}`}
                            </h4>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  ) : (
                    <>
                      <img
                        alt=""
                        src={textToBase64Barcode(batchSerial.serialNo || batchSerial.batchNo, {
                          width: 4,
                          height: 80,
                          margin: 0,
                          displayValue: true,
                          fontSize: 40,
                          font: 'Roboto, sans-serif',
                          fontOptions: 'bold'
                        })}
                        style={{
                          objectFit: 'contain'
                        }}
                        width="100%"
                      />
                      <table>
                        <tbody>
                          <tr>
                            <td align="center">
                              <h4 style={{ margin: 0 }}>{companyInfo?.name}</h4>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </>
                  )}
                </div>
              ))
            )
          )}
        </div>
        <iframe
          title="Print window"
          id="batch-serial-iframe"
          style={{
            border: 0,
            height: 0,
            width: 0,
            position: 'absolute'
          }}
        />
      </div>
    )
  })
}

export default printBatchSerial
